import { describe, expect, it } from 'vitest';
import type { IValueChange } from '../src/types/diff';
import type { JsonValue } from '../src/types/json';
import type { IUploadedForm } from '../src/types/shesha-form';
import { getArrayEntries } from '../src/utils/diff/array-entries';
import { getChangeLabel } from '../src/utils/diff/change-labels';
import { compareValues } from '../src/utils/diff/compare-values';
import { compareForms } from '../src/utils/diff/compare-forms';
import { createDiffSelections } from '../src/utils/diff/create-selections';
import { groupChanges } from '../src/utils/diff/group-changes';

const changes = (): IValueChange[] => compareValues({
  before: [{ id: 'save', label: 'Save', tooltip: 'Before', actionConfiguration: { actionArguments: { expression: 'before' } } }],
  after: [
    { id: 'cancel', label: 'Cancel' },
    { id: 'save', label: 'Save', tooltip: 'After', actionConfiguration: { actionArguments: { expression: 'after' } } },
  ],
  basePath: 'items', idPrefix: 'buttons', scope: 'component',
});

describe('wizard step labels', () => {
  const compareSteps = (before: JsonValue[], after: JsonValue[]): IValueChange[] => compareValues({
    before, after, basePath: 'steps', idPrefix: 'wizard', scope: 'component',
  });

  it.each([
    { title: 'Read This', label: 'Step 8', name: 'step8', expected: 'Step 1 - Read This' },
    { title: { _code: 'return data.title;' }, label: 'Details', name: 'step1', expected: 'Step 1 - Details' },
    { title: '', label: '', name: 'details', expected: 'Step 1 - details' },
    { title: '', label: '', name: '', expected: 'Step 1' },
  ])('uses a configured title or a safe fallback: $expected', ({ title, label, name, expected }) => {
    const step = { id: 'details', title, label, name, customVisibility: 'return true;' };
    const result = compareSteps([step], [{ ...step, customVisibility: 'return false;' }]);
    const panel = groupChanges(result)[0]?.children[0];

    expect(panel?.label).toBe(expected);
    expect(panel?.children[0]?.label).toBe('Custom Visibility');
    expect(result[0]?.path).toBe('steps[id="details"].customVisibility');
  });

  it('shows the new number and title after a move while matching by key, not by title', () => {
    const details = {
      key: 'details', title: 'Details',
      beforeNextActionConfiguration: { actionArguments: { expression: 'return data;' } },
    };
    const documents = { key: 'documents', title: 'Documents', customVisibility: 'return true;' };
    const result = compareSteps([details, documents], [documents, {
      ...details, title: 'Organisation Details',
      beforeNextActionConfiguration: { actionArguments: { expression: 'return data.npo;' } },
    }]);
    const script = result.find((change) => change.isScript);

    expect(result.map((change) => change.path)).toEqual([
      'steps.@order', 'steps[key="details"].beforeNextActionConfiguration.actionArguments.expression',
      'steps[key="details"].title',
    ]);
    expect(script && getChangeLabel(script)).toBe('Steps / Step 2 - Organisation Details / Before Next / Script');
    expect(result.filter((change) => change.isScript)).toHaveLength(1);
  });

  it('uses the old number and title for a removed step', () => {
    const details = { id: 'details', title: 'Details' };
    const removed = { id: 'declaration', title: 'Declaration', customVisibility: 'return true;' };
    const result = compareSteps([details, removed], [details]);

    expect(result.every((change) => change.changeType === 'removed')).toBe(true);
    expect(groupChanges(result)[0]?.children[0]?.label).toBe('Step 2 - Declaration');
  });

  it('uses position when a step has neither an ID nor a key', () => {
    const before = [{ title: 'Details', customVisibility: 'return true;' }];
    const result = compareSteps(before, [{ ...before[0], customVisibility: 'return false;' }]);

    expect(result[0]?.path).toBe('steps[0].customVisibility');
    expect(result[0]?.groups?.at(-1)?.label).toBe('Step 1 - Details');
  });
});

describe('friendly change panels', () => {
  it('nests only changed items, with readable property labels and original paths', () => {
    const panels = groupChanges(changes());
    const items = panels[0];
    const save = items?.children.find((panel) => panel.label === 'Save');
    const script = save?.children.find((panel) => panel.change?.isScript);

    expect(panels).toHaveLength(1);
    expect(items?.label).toBe('Items');
    expect(items?.changeCount).toBe(4);
    expect(items?.children.map((panel) => panel.label)).toEqual(['Cancel', 'Save']);
    expect(save?.children.map((panel) => panel.label)).toEqual(['Action / Script', 'Tooltip']);
    expect(script?.path).toBe('items[id="save"].actionConfiguration.actionArguments.expression');
    expect(script?.change?.before).toBe('before');
  });

  it('keeps duplicate button labels separate using their identities', () => {
    const result = compareValues({
      before: [{ id: 'first', label: 'Save' }, { id: 'second', label: 'Save' }],
      after: [{ id: 'first', label: 'Save', tooltip: 'First' }, { id: 'second', label: 'Save', tooltip: 'Second' }],
      basePath: 'items', idPrefix: 'buttons', scope: 'component',
    });
    const items = groupChanges(result)[0];

    expect(items?.children).toHaveLength(2);
    expect(new Set(items?.children.map((panel) => panel.key)).size).toBe(2);
  });

  it('preserves ordinary property panels and uses a readable label', () => {
    const result = compareValues({
      before: false, after: true, basePath: 'readOnly', idPrefix: 'field', scope: 'component',
    });

    expect(groupChanges(result)[0]).toMatchObject({ label: 'Read Only', path: 'readOnly', change: result[0] });
  });

  it('uses the button name in the Scripts filter while keeping raw ID searches working', () => {
    const propertyChanges = changes();
    const script = propertyChanges.find((change) => change.isScript);
    const form: IUploadedForm = {
      form: { components: [], formSettings: {} },
      metadata: { displayName: 'Actions', fileName: 'actions.json', fileSize: 100 },
      warnings: [],
    };
    const diff = compareForms(form, form);
    diff.componentChanges.push({
      label: 'Actions', id: 'buttons', componentType: 'buttonGroup', changeType: 'modified',
      path: 'Actions', propertyChanges,
    });
    diff.scriptChanges = script ? [script] : [];

    expect(script && getChangeLabel(script)).toBe('Items / Save / Action / Script');
    const selections = createDiffSelections(diff, 'scripts', 'id="save"');
    expect(selections).toHaveLength(1);
    expect(selections[0]?.label).toBe('Items / Save / Action / Script');
    expect(createDiffSelections(diff, 'scripts', 'Cancel')).toHaveLength(0);
  });
});

describe('table entry labels', () => {
  it.each<{ value: JsonValue; expected: string }>([
    { value: { caption: 'Type Of Disability', propertyName: 'person.typeOfDisability' }, expected: 'Type Of Disability' },
    { value: { caption: 'Full Name', name: 'column1' }, expected: 'Full Name' },
    { value: { label: 'Explicit label', caption: 'Caption' }, expected: 'Explicit label' },
    { value: { caption: ' ', propertyName: 'person.fullName' }, expected: 'person.fullName' },
    { value: { caption: '', actionConfiguration: { actionName: 'Show Dialog', actionArguments: { modalTitle: 'Edit Office Bearer' } } }, expected: 'Edit Office Bearer' },
    { value: { actionConfiguration: { actionName: 'Show Confirmation Dialog', actionArguments: { title: 'Remove Office Bearer' } } }, expected: 'Remove Office Bearer' },
    { value: { actionConfiguration: { actionName: 'Refresh table' } }, expected: 'Refresh table' },
    { value: { caption: { _code: 'return data.caption;' }, propertyName: 'person.fullName' }, expected: 'person.fullName' },
    { value: { caption: false, actionConfiguration: null }, expected: 'Item 1' },
  ])('uses descriptive fields without executing expressions: $expected', ({ value, expected }) => {
    expect(getArrayEntries([value], 'items')[0]?.label).toBe(expected);
  });

  it('keeps renamed columns matched by ID and uses the new caption for their panel', () => {
    const result = compareValues({
      before: [{ id: 'disability', caption: 'Type Of Disability' }],
      after: [{ id: 'disability', caption: 'Disability Type' }],
      basePath: 'items', idPrefix: 'table', scope: 'component',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ path: 'items[id="disability"].caption', changeType: 'modified' });
    expect(groupChanges(result)[0]?.children[0]?.label).toBe('Disability Type');
  });

  it('groups caption-only columns even without an ID or button label', () => {
    const result = compareValues({
      before: [{ caption: 'Full Name', isVisible: true }],
      after: [{ caption: 'Full Name', isVisible: false }],
      basePath: 'items', idPrefix: 'table', scope: 'component',
    });

    expect(result[0]?.path).toBe('items[0].isVisible');
    expect(groupChanges(result)[0]?.children[0]?.label).toBe('Full Name');
  });
});
