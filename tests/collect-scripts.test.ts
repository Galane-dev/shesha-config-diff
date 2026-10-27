import { describe, expect, it } from 'vitest';
import type { ISheshaFormExport } from '../src/types/shesha-form';
import { collectScripts } from '../src/utils/review/collect-scripts';

describe('script collection', () => {
  it('includes unchanged scripts, lifecycle hooks, dynamic values and dialog arguments without scanning plain text', () => {
    const form: ISheshaFormExport = {
      components: [{ id: 'field', label: 'Name', type: 'textField',
        description: 'console.log(data)', helpText: 'const x = ;', code: 'ZA',
        hidden: { _mode: 'code', _code: 'return data.hidden;' },
        disabled: { _mode: 'value', _value: false, _code: 'console.log(data);' },
        actionConfiguration: { actionArguments: { formArguments: 'return data;', expression: 'console.log("Ready");' } },
      }],
      formSettings: { onBeforeDataLoad: 'return query;', onAfterDataLoad: 'console.log(data);' },
    };
    const result = collectScripts(form);
    expect(result).toHaveLength(5);
    expect(result.map((script) => script.path)).toEqual(expect.arrayContaining([
      'hidden', 'actionConfiguration.actionArguments.formArguments', 'formSettings.onBeforeDataLoad',
    ]));
    expect(result.some((script) => script.path.includes('description') || script.path === 'disabled')).toBe(false);
  });

  it('collects deeply nested components only once, with named wizard/button/column context', () => {
    const form: ISheshaFormExport = {
      components: [{ id: 'wizard', label: 'Wizard', type: 'wizard', steps: [{
        id: 'details', title: 'Details', beforeNextActionConfiguration: { actionArguments: { expression: 'return data;' } },
        components: [{ id: 'table', label: 'Table', type: 'datatable', items: [{
          id: 'column', caption: 'Type Of Disability', customVisibility: 'return true;',
        }] }],
      }] }], formSettings: {},
    };
    const result = collectScripts(form);
    expect(result).toHaveLength(2);
    expect(result.map((script) => script.label)).toEqual(expect.arrayContaining([
      'Wizard / Steps / Step 1 - Details / Before Next / Script',
      'Wizard / Details / Table / Items / Type Of Disability / Custom Visibility',
    ]));
    expect(new Set(result.map((script) => script.id)).size).toBe(2);
  });

  it('preserves script identity when a component moves or is renamed', () => {
    const field = { id: 'field', label: 'Before', onChange: 'console.log(data);' };
    const before = collectScripts({ components: [field], formSettings: {} });
    const after = collectScripts({ components: [{ id: 'container', components: [{ ...field, label: 'After' }] }], formSettings: {} });
    expect(before[0]?.id).toBe(after[0]?.id);
  });

  it('disambiguates duplicate component IDs', () => {
    const component = { id: 'same', onChange: 'console.log(data);' };
    const result = collectScripts({ components: [component, component], formSettings: {} });
    expect(new Set(result.map((script) => script.id)).size).toBe(2);
  });
});
