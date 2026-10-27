import { describe, expect, it } from 'vitest';
import type { IFormDiff } from '../src/types/diff';
import type { ISheshaComponent, ISheshaFormExport, IUploadedForm } from '../src/types/shesha-form';
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

const CHILD_LAYOUTS: { name: string; wrap: (components: ISheshaComponent[]) => ISheshaComponent }[] = [
  { name: 'direct children', wrap: (components) => ({ id: 'layout', type: 'container', components }) },
  { name: 'wizard steps', wrap: (components) => ({ id: 'layout', type: 'wizard', steps: [{ id: 'step', label: 'Details', components }] }) },
  { name: 'tabs', wrap: (components) => ({ id: 'layout', type: 'tabs', tabs: [{ key: 'tab', label: 'Details', components }] }) },
  { name: 'columns', wrap: (components) => ({ id: 'layout', type: 'columns', columns: [{ id: 'column', components }] }) },
  { name: 'panel headers', wrap: (components) => ({ id: 'layout', type: 'collapsiblePanel', header: { components } }) },
  { name: 'panel content', wrap: (components) => ({ id: 'layout', type: 'collapsiblePanel', content: { components } }) },
];

const compareComponents = (before: ISheshaComponent[], after: ISheshaComponent[]): IFormDiff => compareForms(
  createUploadedForm({ components: before, formSettings: {} }, 'before.json'),
  createUploadedForm({ components: after, formSettings: {} }, 'after.json'),
);

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

  it.each(CHILD_LAYOUTS)('finds nested scripts without reporting the parent again: $name', ({ wrap }) => {
    const before = { id: 'field', type: 'textField', label: 'Name', validator: { _code: 'return true;' } };
    const after = { ...before, validator: { _code: 'return false;' } };
    const result = compareComponents([wrap([before])], [wrap([after])]);

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.componentId).toBe('field');
    expect(result.componentChanges[0]?.propertyChanges.map((change) => change.path)).toEqual(['validator']);
    expect(result.scriptChanges).toHaveLength(1);
    expect(result.counts.components).toBe(1);
  });

  it.each(CHILD_LAYOUTS)('finds added and removed children without duplicating them on the parent: $name', ({ wrap }) => {
    const result = compareComponents(
      [wrap([{ id: 'removed', type: 'textField', label: 'Old field' }])],
      [wrap([{ id: 'added', type: 'button', label: 'New action' }])],
    );

    expect(result.componentChanges).toHaveLength(2);
    expect(result.componentChanges.find((change) => change.componentId === 'removed')?.changeType).toBe('removed');
    expect(result.componentChanges.find((change) => change.componentId === 'added')?.changeType).toBe('added');
    expect(result.counts.added).toBe(1);
    expect(result.counts.removed).toBe(1);
  });

  it('finds children through combined wizard, panel, and column nesting', () => {
    const wrap = (label: string): ISheshaComponent => ({
      id: 'wizard', type: 'wizard', steps: [{
        id: 'step', label: 'Details', components: [{
          id: 'panel', type: 'collapsiblePanel', content: { components: [{
            id: 'grid', type: 'columns', columns: [{
              id: 'column', components: [{ id: 'field', type: 'textField', label }],
            }],
          }] },
        }],
      }],
    });
    const result = compareComponents([wrap('Before')], [wrap('After')]);

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.componentId).toBe('field');
    expect(result.componentChanges[0]?.path).toContain('Details');
    expect(result.componentChanges[0]?.path).toContain('Content');
  });

  it('detects a move between header and content slots of the same parent', () => {
    const field = { id: 'field', type: 'textField', label: 'Name' };
    const result = compareComponents(
      [{ id: 'panel', type: 'collapsiblePanel', header: { components: [field] }, content: { components: [] } }],
      [{ id: 'panel', type: 'collapsiblePanel', header: { components: [] }, content: { components: [field] } }],
    );

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.changeType).toBe('moved');
    expect(result.componentChanges[0]?.previousPath).toContain('Header');
    expect(result.componentChanges[0]?.path).toContain('Content');
    expect(result.componentChanges[0]?.propertyChanges.map((change) => change.path)).toEqual(['@parent']);
  });

  it.each(['id', 'key'])('uses a stable step %s when steps are reordered', (identifier) => {
    const first = { [identifier]: 'first', label: 'First', components: [{ id: 'field', type: 'textField' }] };
    const second = { [identifier]: 'second', label: 'Second', components: [] };
    const result = compareComponents(
      [{ id: 'wizard', type: 'wizard', steps: [first, second] }],
      [{ id: 'wizard', type: 'wizard', steps: [second, first] }],
    );

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.componentId).toBe('wizard');
    expect(result.componentChanges[0]?.propertyChanges[0]?.path).toBe('steps.@order');
  });

  it('preserves sibling ordering inside nested collections', () => {
    const fields = [{ id: 'first', type: 'textField' }, { id: 'second', type: 'textField' }];
    const wrap = (components: ISheshaComponent[]): ISheshaComponent => ({
      id: 'grid', type: 'columns', columns: [{ id: 'column', components }],
    });
    const result = compareComponents([wrap(fields)], [wrap([...fields].reverse())]);

    expect(result.componentChanges).toHaveLength(2);
    expect(result.componentChanges.every((change) => change.changeType === 'moved')).toBe(true);
    expect(result.componentChanges.every((change) => change.propertyChanges[0]?.path === '@order')).toBe(true);
  });

  it('keeps anonymous children in different slots distinct', () => {
    const wrap = (helpText: string): ISheshaComponent => ({
      id: 'panel', type: 'collapsiblePanel',
      header: { components: [{ type: 'textField', label: 'Name', helpText }] },
      content: { components: [{ type: 'textField', label: 'Name', helpText: 'unchanged' }] },
    });
    const result = compareComponents([wrap('before')], [wrap('after')]);

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.path).toContain('Header');
    expect(result.componentChanges[0]?.changeType).toBe('modified');
  });

  it('continues comparing container settings after extracting children', () => {
    const field = { id: 'field', type: 'textField' };
    const result = compareComponents(
      [{ id: 'panel', type: 'collapsiblePanel', header: { title: 'Before', components: [field] } }],
      [{ id: 'panel', type: 'collapsiblePanel', header: { title: 'After', components: [field] } }],
    );

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.componentId).toBe('panel');
    expect(result.componentChanges[0]?.propertyChanges[0]?.path).toBe('header.title');
  });

  it('does not index component-shaped data inside ordinary configuration arrays', () => {
    const wrap = (label: string): ISheshaComponent => ({
      id: 'select', type: 'dropdown', options: [{
        id: 'option', type: 'custom', components: [{ id: 'data', type: 'textField', label }],
      }],
    });
    const result = compareComponents([wrap('Before')], [wrap('After')]);

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.componentId).toBe('select');
    expect(result.componentChanges[0]?.propertyChanges[0]?.path).toBe('options');
  });

  it('keeps nested action scripts under their owning component and in the Scripts filter', () => {
    const button = (expression: string): ISheshaComponent => ({
      id: 'buttons', type: 'buttonGroup', label: 'Actions', items: [{
        id: 'save', label: 'Save', actionConfiguration: { actionArguments: { expression } },
      }],
    });
    const result = compareComponents([button('return data;')], [button('return data.id;')]);

    expect(result.componentChanges).toHaveLength(1);
    expect(result.componentChanges[0]?.componentId).toBe('buttons');
    expect(result.componentChanges[0]?.propertyChanges).toHaveLength(1);
    expect(result.scriptChanges).toHaveLength(1);
    expect(result.scriptChanges[0]?.path).toBe('items[id="save"].actionConfiguration.actionArguments.expression');
    expect(result.counts.components).toBe(1);
    expect(result.counts.scripts).toBe(1);
  });
});
