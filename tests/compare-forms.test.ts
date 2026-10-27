import { describe, expect, it } from 'vitest';
import type { ISheshaFormExport, IUploadedForm } from '../src/types/shesha-form';
import { compareForms } from '../src/utils/diff/compare-forms';

const createUploadedForm = (form: ISheshaFormExport, fileName: string): IUploadedForm => ({
  form,
  metadata: {
    configName: 'sample-form',
    displayName: 'sample-form',
    fileName,
    fileSize: 100,
    moduleName: 'example.module',
  },
  warnings: [],
});

describe('compareForms', () => {
  it('ignores object key ordering', () => {
    const before = createUploadedForm({
      components: [{ id: 'field-1', label: 'Name', type: 'textField' }],
      formSettings: { modelType: 'Example.Record', version: 1 },
    }, 'before.json');
    const after = createUploadedForm({
      components: [{ type: 'textField', label: 'Name', id: 'field-1' }],
      formSettings: { version: 1, modelType: 'Example.Record' },
    }, 'after.json');

    const result = compareForms(before, after);

    expect(result.hasChanges).toBe(false);
    expect(result.counts.total).toBe(0);
  });

  it('finds component, setting, movement, and script changes', () => {
    const before = createUploadedForm({
      components: [
        {
          id: 'field-1',
          label: 'Name',
          type: 'textField',
          validator: { _code: 'return value.length > 0;', _mode: 'code' },
        },
      ],
      formSettings: { onAfterDataLoad: 'return data;' },
    }, 'before.json');
    const after = createUploadedForm({
      components: [
        { id: 'field-2', label: 'Email', type: 'textField' },
        {
          id: 'field-1',
          label: 'Organisation name',
          type: 'textField',
          validator: { _code: 'return value.trim().length > 0;', _mode: 'code' },
        },
      ],
      formSettings: { onAfterDataLoad: 'return { ...data, loaded: true };' },
    }, 'after.json');

    const result = compareForms(before, after);
    const changedField = result.componentChanges.find((change) => change.componentId === 'field-1');

    expect(result.hasChanges).toBe(true);
    expect(result.componentChanges.some((change) => change.componentId === 'field-2')).toBe(true);
    expect(changedField?.propertyChanges.map((change) => change.path)).toEqual(
      expect.arrayContaining(['@order', 'label', 'validator']),
    );
    expect(result.formSettingChanges[0]?.path).toBe('formSettings.onAfterDataLoad');
    expect(result.scriptChanges).toHaveLength(2);
  });

  it('preserves array ordering as a meaningful change', () => {
    const before = createUploadedForm({
      components: [{ id: 'select-1', type: 'dropdown', values: ['one', 'two'] }],
      formSettings: {},
    }, 'before.json');
    const after = createUploadedForm({
      components: [{ id: 'select-1', type: 'dropdown', values: ['two', 'one'] }],
      formSettings: {},
    }, 'after.json');

    const result = compareForms(before, after);

    expect(result.componentChanges[0]?.propertyChanges[0]?.path).toBe('values');
  });
});
