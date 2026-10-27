import { describe, expect, it } from 'vitest';
import type { IValueChange } from '../src/types/diff';
import type { JsonValue } from '../src/types/json';
import { compareValues } from '../src/utils/diff/compare-values';

const compare = (before: JsonValue | undefined, after: JsonValue | undefined, path = 'items'): IValueChange[] =>
  compareValues({ before, after, basePath: path, idPrefix: 'button-group', scope: 'component' });

const action = (expression: JsonValue, label = 'Save'): JsonValue => ({
  id: 'save', label, editMode: 'inherited', actionConfiguration: {
    _type: 'action-config', actionName: 'Execute Script', actionArguments: { expression },
  },
});

const expressionPath = 'items[id="save"].actionConfiguration.actionArguments.expression';

describe('nested script comparisons', () => {
  it('reports only the expression when its surrounding configuration is unchanged', () => {
    const before = 'return new Promise(resolve => {\r\n  resolve();\r\n});';
    const after = 'return new Promise(resolve => {\r\n  resolve(data);\r\n});';
    const result = compare([action(before)], [action(after)]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ path: expressionPath, before, after, isScript: true, changeType: 'modified' });
  });

  it('keeps metadata changes separate without repeating the extracted script', () => {
    const result = compare([action('old script')], [action('new script', 'Submit')]);
    const metadata = result.find((change) => change.path === 'items[id="save"].label');

    expect(result).toHaveLength(2);
    expect(metadata?.isScript).toBe(false);
    expect(JSON.stringify(metadata)).toContain('Submit');
    expect(JSON.stringify(metadata)).not.toContain('old script');
    expect(JSON.stringify(metadata)).not.toContain('new script');
    expect(result.find((change) => change.path === expressionPath)?.isScript).toBe(true);
    expect(metadata?.groups).toEqual([{ path: 'items', label: 'Items' }, { path: 'items[id="save"]', label: 'Submit' }]);
  });

  it('matches button IDs when another item is inserted before an unchanged script', () => {
    const cancel = { id: 'cancel', label: 'Cancel', editMode: 'inherited', actionConfiguration: { actionName: 'Close Dialog' } };
    const result = compare([action('same script')], [cancel, action('same script')]);

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((change) => change.path.startsWith('items[id="cancel"].'))).toBe(true);
    expect(result.every((change) => change.changeType === 'added' && !change.isScript)).toBe(true);
    expect(result.find((change) => change.propertyName === 'label')?.after).toBe('Cancel');
  });

  it('preserves ordering changes without reporting unchanged scripts as edited', () => {
    const cancel = { id: 'cancel', label: 'Cancel' };
    const result = compare([cancel, action('same script')], [action('same script'), cancel]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ path: 'items.@order', changeType: 'modified', isScript: false });
  });

  it.each([
    { before: [] as JsonValue[], after: [action('added script')], type: 'added', value: 'added script' },
    { before: [action('removed script')], after: [] as JsonValue[], type: 'removed', value: 'removed script' },
  ])('extracts scripts from $type items', (example) => {
    const result = compare(example.before, example.after);
    const script = result.find((change) => change.isScript);

    expect(script?.path).toBe(expressionPath);
    expect(script?.changeType).toBe(example.type);
    expect(example.type === 'added' ? script?.after : script?.before).toBe(example.value);
    expect(result.filter((change) => change.isScript)).toHaveLength(1);
    expect(result.find((change) => change.path === 'items[id="save"].label')).toBeDefined();
  });

  it('finds scripts inside a newly added non-array action configuration', () => {
    const result = compare(undefined, {
      actionName: 'Execute Script', actionArguments: { expression: 'return data;' },
    }, 'actionConfiguration');

    expect(result.find((change) => change.isScript)).toMatchObject({
      path: 'actionConfiguration.actionArguments.expression', changeType: 'added', after: 'return data;',
    });
    expect(JSON.stringify(result.find((change) => !change.isScript))).not.toContain('return data;');
  });

  it('falls back to positions for action chains without IDs', () => {
    const result = compare([{ actionArguments: { expression: 'before' } }], [{ actionArguments: { expression: 'after' } }]);

    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('items[0].actionArguments.expression');
  });

  it('keeps duplicate IDs and duplicate-looking IDs distinct', () => {
    const before = ['same', 'same', 'same#2'].map((id) => ({ id, expression: 'before' }));
    const after = before.map((item) => ({ ...item, expression: 'after' }));
    const result = compare(before, after);

    expect(result).toHaveLength(3);
    expect(new Set(result.map((change) => change.id)).size).toBe(3);
    expect(result.every((change) => change.isScript)).toBe(true);
  });

  it('treats code wrappers as atomic script values rather than separate metadata fields', () => {
    const before = { _mode: 'code', _code: 'return true;' };
    const after = { _mode: 'code', _code: 'return false;' };
    const result = compare([action(before)], [action(after)]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ path: expressionPath, before, after, isScript: true });
  });

  it('preserves a literal replacement at an extracted script path', () => {
    const result = compare([action('return data;')], [action(null)]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ before: 'return data;', after: null, path: expressionPath });
  });

  it('does not report nested scripts twice when their container becomes a code wrapper', () => {
    const result = compare(
      [{ id: 'save', hidden: { expression: 'old condition' } }],
      [{ id: 'save', hidden: { _code: 'new condition' } }],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.path).toBe('items[id="save"].hidden');
  });

  it('does not inherit script classification from an ancestor event property', () => {
    const result = compare(
      [{ id: 'save', label: 'Before', actionArguments: { expression: 'old script' } }],
      [{ id: 'save', label: 'After', actionArguments: { expression: 'new script' } }],
      'onClick.actions',
    );

    expect(result.filter((change) => change.isScript)).toHaveLength(1);
    expect(result.find((change) => change.path === 'onClick.actions[id="save"].label')?.isScript).toBe(false);
  });

  it.each([
    { before: ['one', 'two'], after: ['two', 'one'] },
    { before: [null, 1], after: [null, 2] },
    { before: [{ code: 'ZA', description: 'Before' }], after: [{ code: 'GB', description: 'After' }] },
  ])('leaves ordinary arrays as single configuration changes: $before', ({ before, after }) => {
    const result = compare(before, after);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ before, after, path: 'items', isScript: false });
  });

  it('keeps unrelated object arrays atomic even when their entries have IDs and labels', () => {
    const before = [{ id: 'one', label: 'Before' }];
    const after = [{ id: 'one', label: 'After' }];
    expect(compare(before, after, 'options')).toMatchObject([{ before, after, path: 'options', isScript: false }]);
  });

  it('separates nested dialog buttons and their ordinary properties as well as scripts', () => {
    const wrap = (label: string, expression: string): JsonValue[] => [{
      id: 'open', label: 'Add partner', actionConfiguration: { actionArguments: { buttons: [{
        id: 'save', label, tooltip: 'Unchanged', actionConfiguration: { actionArguments: { expression } },
      }] } },
    }];
    const result = compare(wrap('Save', 'old script'), wrap('Submit', 'new script'));

    expect(result).toHaveLength(2);
    expect(result[0]?.groups?.map((group) => group.label)).toEqual(['Items', 'Add partner', 'Buttons', 'Submit']);
    expect(result.map((change) => change.propertyName).sort()).toEqual(['expression', 'label']);
    expect(result.every((change) => !change.path.includes('tooltip'))).toBe(true);
    expect(result.filter((change) => change.isScript)).toHaveLength(1);
  });

  it('does not report an unchanged button alongside a modified one', () => {
    const unchanged = { id: 'cancel', label: 'Cancel', buttonType: 'default' };
    const result = compare([unchanged, action('before')], [unchanged, action('after')]);

    expect(result).toHaveLength(1);
    expect(result[0]?.groups?.at(-1)?.label).toBe('Save');
  });

  it('does not lose added or removed empty settings objects', () => {
    const before = [{ id: 'save', label: 'Save' }];
    const after = [{ ...before[0], actionConfiguration: {} }];
    expect(compare(before, after)).toMatchObject([{
      path: 'items[id="save"].actionConfiguration', after: {}, changeType: 'added',
    }]);
    expect(compare(after, before)).toMatchObject([{
      path: 'items[id="save"].actionConfiguration', before: {}, changeType: 'removed',
    }]);
  });

  it('keeps renamed buttons matched by ID and includes scripts on newly added nested buttons', () => {
    const before = [{ id: 'open', label: 'Open' }];
    const after = [{ id: 'open', label: 'Open dialog', actionConfiguration: { actionArguments: {
      buttons: [action('return data;')],
    } } }];
    const result = compare(before, after);
    const script = result.find((change) => change.isScript);

    expect(script?.groups?.map((group) => group.label)).toEqual(['Items', 'Open dialog', 'Buttons', 'Save']);
    expect(script?.changeType).toBe('added');
    expect(result.filter((change) => change.propertyName === 'label')).toHaveLength(2);
  });

  it.each([{ before: undefined, after: [] }, { before: [], after: null }])(
    'preserves empty or non-array collection replacements', ({ before, after }) => {
      expect(compare(before, after)).toMatchObject([{ before, after, path: 'items' }]);
    },
  );

  it('does not mutate either input', () => {
    const before = [action('before')];
    const after = [action('after', 'Submit')];
    const original = JSON.stringify([before, after]);

    compare(before, after);

    expect(JSON.stringify([before, after])).toBe(original);
  });
});
