import { describe, expect, it } from 'vitest';
import { MAX_AI_PAYLOAD_CHARACTERS } from '../src/constants/app';
import type { ISheshaFormExport, IUploadedForm } from '../src/types/shesha-form';
import { createReviewRequest } from '../src/utils/ai/create-review-request';
import { REVIEW_INSTRUCTIONS } from '../src/utils/ai/review-prompt';
import { sanitizeValue } from '../src/utils/ai/sanitize-value';
import { compareForms } from '../src/utils/diff/compare-forms';

const upload = (form: ISheshaFormExport): IUploadedForm => ({
  form,
  metadata: { displayName: 'Form', fileName: 'form.json', fileSize: 1 },
  warnings: [],
});

const requestFor = (
  after: ISheshaFormExport,
  before = after,
): ReturnType<typeof createReviewRequest> =>
  createReviewRequest(compareForms(upload(before), upload(after)), after);

describe('AI review context', () => {
  it('includes unchanged After configuration and keeps Before code in change context only', () => {
    const before = {
      components: [{ id: 'name', type: 'textField', label: 'Name', required: true }],
      formSettings: { onBeforeSubmit: 'return oldSave();' },
    };
    const after = { ...before, formSettings: { onBeforeSubmit: 'return latestSave();' } };
    const original = JSON.stringify(after);
    const request = requestFor(after, before);
    const latest = request.targets.map((target) => target.source).join('\n');

    expect(latest).toContain('latestSave');
    expect(latest).toContain('required');
    expect(latest).not.toContain('oldSave');
    expect(request.payload).toContain('oldSave');
    expect(JSON.stringify(after)).toBe(original);
    expect(request.wasTruncated).toBe(false);
  });

  it('recognises nested component slots and gives each latest location an unambiguous id', () => {
    const request = requestFor({
      components: [
        {
          id: 'wizard',
          type: 'wizard',
          label: 'Wizard',
          steps: [
            {
              id: 'details',
              title: 'Details',
              components: [{ id: 'name', type: 'textField', label: 'Name' }],
            },
          ],
        },
      ],
      formSettings: {},
    });
    expect(request.targets.map((target) => target.label)).toContain('Wizard / Details / Name');
    expect(new Set(request.targets.map((target) => target.id)).size).toBe(request.targets.length);
    expect(request.targets[1]?.source).not.toContain('textField');
  });

  it('includes current local concerns but never removed Before findings', () => {
    const before = { components: [], formSettings: { onBeforeSubmit: 'console.log(data);' } };
    const after = { components: [], formSettings: { onBeforeSubmit: 'return data?.npo.type;' } };
    const request = requestFor(after, before);
    const payload = JSON.parse(request.payload) as { reviewConcerns: { rule: string }[] };
    expect(payload.reviewConcerns.map((finding) => finding.rule)).toEqual(['unsafe-access']);
  });

  it('gives unchanged wizard actions their own script context and reference', () => {
    const request = requestFor({
      components: [
        {
          id: 'wizard',
          type: 'wizard',
          steps: [
            {
              id: 'details',
              title: 'Details',
              beforeNextActionConfiguration: {
                actionArguments: { expression: 'return http.put("/save", data);' },
              },
            },
          ],
        },
      ],
      formSettings: {},
    });
    const script = request.targets.find((target) => target.kind === 'script');
    expect(script?.label).toContain('Details');
    expect(script?.source).toContain('http.put');
    expect(script?.executionContext).toBe('async');
    expect(script?.requiresCompletion).toBe(true);
  });

  it('redacts configuration values and credential literals in scripts before sharing or previewing', () => {
    const request = requestFor({
      components: [],
      formSettings: {
        apiKey: 'private-configuration-fixture',
        onBeforeSubmit: 'const apiKey = "private-script-fixture"; return save(apiKey);',
      },
    });
    expect(request.payload).not.toContain('private-configuration-fixture');
    expect(request.payload).not.toContain('private-script-fixture');
    expect(request.targets[0]?.source).not.toContain('private-script-fixture');
    expect(request.redactionCount).toBeGreaterThan(0);
  });

  it('bounds whole records, reports omissions and keeps the envelope valid JSON', () => {
    const request = requestFor({
      components: Array.from({ length: 100 }, (_, index) => ({
        id: String(index),
        type: 'textField',
        label: `Field ${index}`,
        description: 'x'.repeat(5_000),
      })),
      formSettings: { onBeforeSubmit: 'return data;' },
    });
    expect(request.payload.length).toBeLessThanOrEqual(MAX_AI_PAYLOAD_CHARACTERS);
    expect(() => JSON.parse(request.payload) as unknown).not.toThrow();
    expect(request.omittedTargets).toBeGreaterThan(0);
    expect(request.wasTruncated).toBe(true);
    expect(request.targets.some((target) => target.truncated)).toBe(true);
  });

  it('does not execute scripts while building context', () => {
    const request = requestFor({
      components: [],
      formSettings: {
        onBeforeSubmit: 'throw new Error("must-not-execute");',
      },
    });
    expect(request.payload).toContain('must-not-execute');
    expect(REVIEW_INSTRUCTIONS).toContain('UNTRUSTED DATA');
    expect(REVIEW_INSTRUCTIONS).toContain('ONLY for supplied latestForm targets');
    expect(REVIEW_INSTRUCTIONS).toContain('at most THREE');
  });

  it('reports shortened individual values even when the overall payload is small', () => {
    const sanitized = sanitizeValue({ notes: 'x'.repeat(5_000) }, 'settings');
    expect(sanitized.wasTruncated).toBe(true);
    expect(JSON.stringify(sanitized.value)).toContain('[VALUE TRUNCATED]');
  });
});
