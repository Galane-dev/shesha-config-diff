import { describe, expect, it } from 'vitest';
import type { ISheshaFormExport } from '../src/types/shesha-form';
import { MAX_REVIEW_SCRIPT_LENGTH } from '../src/constants/review';
import { compareReviews } from '../src/utils/review/compare-reviews';

const form = (source?: string): ISheshaFormExport => ({ components: [], formSettings: source ? { onAfterDataLoad: source } : {} });

describe('review comparison', () => {
  it('separates new, existing and resolved findings without depending on line numbers', () => {
    const result = compareReviews(form('console.log("Removed");\nconsole.warn("Existing");'),
      form('\nconsole.warn( "Existing" );\nconsole.log(data.email);'));
    expect(result.findings.map((finding) => [finding.status, finding.rule, finding.side])).toEqual([
      ['new', 'sensitive-logging', 'After'], ['existing', 'console-usage', 'After'], ['resolved', 'console-usage', 'Before'],
    ]);
    expect(result.findings[1]?.line).toBe(2);
  });

  it('reviews unchanged scripts even when there are no configuration differences', () => {
    const input = form('console.log(data);');
    expect(compareReviews(input, input).findings).toMatchObject([{ status: 'existing', rule: 'sensitive-logging' }]);
  });

  it('does not label old logs resolved when the After script cannot be parsed', () => {
    const result = compareReviews(form('console.log(data);'), form('console.log(data);\nconst bad = ;'));
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'syntax-error', status: 'new', side: 'After' }),
      expect.objectContaining({ rule: 'sensitive-logging', status: 'unverified', side: 'Before' }),
    ]));
  });

  it('does not claim new logging when the Before script could not be parsed', () => {
    const result = compareReviews(form('const bad = ;'), form('console.log(data);'));
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'syntax-error', status: 'resolved' }),
      expect.objectContaining({ rule: 'sensitive-logging', status: 'unverified', side: 'After' }),
    ]));
  });

  it('accounts for repeated identical calls independently', () => {
    const result = compareReviews(form('console.log("Ready");'), form('console.log("Ready");\nconsole.log("Ready");'));
    expect(result.findings.map((finding) => finding.status)).toEqual(['new', 'existing']);
  });

  it('resolves findings when their script is removed', () => {
    expect(compareReviews(form('console.log("Ready");'), form()).findings).toMatchObject([{ status: 'resolved', side: 'Before' }]);
  });

  it('reviews scripts in newly added components', () => {
    const result = compareReviews(form(), { components: [{ id: 'new', label: 'New button',
      actionConfiguration: { actionArguments: { expression: 'console.log(data);' } },
    }], formSettings: {} });
    expect(result.findings).toMatchObject([{ status: 'new', script: { label: 'New button / Action / Script' } }]);
  });

  it('reports skipped scripts and keeps their earlier findings unverified', () => {
    const result = compareReviews(form('console.log(data);'), form(`/*${' '.repeat(MAX_REVIEW_SCRIPT_LENGTH)}*/`));
    expect(result.limitations[0]?.side).toBe('After');
    expect(result.limitations[0]?.reason).toContain('review limit');
    expect(result.findings).toMatchObject([{ status: 'unverified', side: 'Before' }]);
  });
});
