import { describe, expect, it } from 'vitest';
import type { IFormDiff } from '../src/types/diff';
import { createSanitizedDiffPayload } from '../src/utils/ai/sanitize-diff';

const createDiff = (): IFormDiff => ({
  afterMetadata: { displayName: 'sample', fileName: 'after.json', fileSize: 1 },
  beforeMetadata: { displayName: 'sample', fileName: 'before.json', fileSize: 1 },
  componentChanges: [],
  counts: {
    added: 0,
    components: 0,
    formSettings: 1,
    modified: 1,
    moved: 0,
    removed: 0,
    scripts: 0,
    total: 1,
  },
  formSettingChanges: [{
    after: 'sk-example-secret-value-123456',
    before: 'old-secret',
    changeType: 'modified',
    id: 'form-settings:apiKey',
    isScript: false,
    path: 'formSettings.apiKey',
    propertyName: 'apiKey',
    scope: 'form-setting',
  }],
  hasChanges: true,
  scriptChanges: [],
});

describe('createSanitizedDiffPayload', () => {
  it('redacts values stored in secret-looking paths', () => {
    const result = createSanitizedDiffPayload(createDiff());

    expect(result.redactionCount).toBe(2);
    expect(result.payload).not.toContain('example-secret');
    expect(result.payload).toContain('[REDACTED]');
  });
});
