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

  it('finds duplicate and missing IDs inside nested structural slots', () => {
    const result = parseSheshaForm(JSON.stringify({
      components: [{ id: 'wizard', type: 'wizard', steps: [{
        id: 'details', components: [
          { id: 'same-id', type: 'textField' },
          { type: 'textField' },
          { id: 'panel', type: 'collapsiblePanel', content: { components: [
            { id: 'same-id', type: 'button' },
            { type: 'textField' },
          ] } },
        ],
      }] }],
      formSettings: {},
    }), 'example.form.json');

    expect(result.uploadedForm?.warnings).toHaveLength(2);
    expect(result.uploadedForm?.warnings.join(' ')).toContain('2 component(s) have no ID');
    expect(result.uploadedForm?.warnings.join(' ')).toContain('same-id');
  });

  it('does not treat layout slots or ordinary data as components needing IDs', () => {
    const result = parseSheshaForm(JSON.stringify({
      components: [{
        id: 'grid', type: 'columns', columns: [{ label: 'Unnamed column', components: [{ id: 'field', type: 'textField' }] }],
        options: [{ components: [{ type: 'example' }] }],
      }],
      formSettings: {},
    }), 'example.form.json');

    expect(result.uploadedForm?.warnings).toEqual([]);
  });

  it('handles a non-string nested component ID without crashing', () => {
    const result = parseSheshaForm(JSON.stringify({
      components: [{ id: 'parent', type: 'container', content: { components: [{ id: 42, type: 'textField' }] } }],
      formSettings: {},
    }), 'example.form.json');

    expect(result.error).toBeUndefined();
    expect(result.uploadedForm?.warnings.join(' ')).toContain('1 component(s) have no ID');
  });
});
