import { describe, expect, it } from 'vitest';
import { parseSheshaForm } from '../src/utils/files/parse-form-file';

describe('parseSheshaForm', () => {
  it('parses metadata from a Shesha export file name and settings', () => {
    const result = parseSheshaForm(JSON.stringify({
      components: [],
      formSettings: {
        modelType: 'example.Domain.Record',
        version: 7,
      },
    }), 'example.module.my-form - 2026-10-14T101500.123.json');

    expect(result.error).toBeUndefined();
    expect(result.uploadedForm?.metadata).toMatchObject({
      configName: 'my-form',
      displayName: 'my-form',
      modelType: 'example.Domain.Record',
      moduleName: 'example.module',
      schemaVersion: 7,
    });
  });

  it('rejects JSON that is not a Shesha form export', () => {
    const result = parseSheshaForm('{"name":"not-a-form"}', 'invalid.json');

    expect(result.error).toContain('Shesha form export');
    expect(result.uploadedForm).toBeUndefined();
  });

  it('warns about duplicate and missing component IDs', () => {
    const result = parseSheshaForm(JSON.stringify({
      components: [
        { id: 'same-id', type: 'textField' },
        { id: 'same-id', type: 'textField' },
        { type: 'textField' },
      ],
      formSettings: {},
    }), 'example.form.json');

    expect(result.uploadedForm?.warnings).toHaveLength(2);
    expect(result.uploadedForm?.warnings.join(' ')).toContain('same-id');
  });
});
