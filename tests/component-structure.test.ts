import { describe, expect, it } from 'vitest';
import type { ISheshaComponent } from '../src/types/shesha-form';
import { getComponentStructure } from '../src/utils/forms/component-structure';

describe('getComponentStructure', () => {
  it('separates child collections from their container settings without mutating the input', () => {
    const field = { id: 'field', type: 'textField' };
    const component: ISheshaComponent = {
      id: 'wizard', type: 'wizard', steps: [{ id: 'details', label: 'Details', components: [field] }],
    };
    const original = JSON.stringify(component);
    const structure = getComponentStructure(component);

    expect(structure.children).toEqual([{
      components: [field], key: 'steps[id:details].components', label: 'Details',
    }]);
    expect(structure.properties.steps).toEqual([{ id: 'details', label: 'Details' }]);
    expect(JSON.stringify(component)).toBe(original);
  });

  it('uses separate location keys for unnamed columns', () => {
    const structure = getComponentStructure({
      id: 'grid', type: 'columns', columns: [{ components: [] }, { components: [] }],
    });

    expect(structure.children.map((child) => child.key)).toEqual([
      'columns[index:0].components', 'columns[index:1].components',
    ]);
  });

  it('preserves dynamic child definitions as configuration values', () => {
    const header = { components: { _mode: 'code', _code: 'return []; ' } };
    const structure = getComponentStructure({ id: 'panel', type: 'collapsiblePanel', header });

    expect(structure.children).toEqual([]);
    expect(structure.properties.header).toEqual(header);
  });

  it('keeps collections with duplicate slot IDs distinct', () => {
    const structure = getComponentStructure({
      id: 'wizard', type: 'wizard', steps: [
        { id: 'same', components: [{ type: 'textField' }] },
        { id: 'same', components: [{ type: 'textField' }] },
      ],
    });

    expect(structure.children.map((child) => child.key)).toEqual([
      'steps[id:same].components', 'steps[id:same#2].components',
    ]);
  });

  it('preserves invalid slot values instead of dropping them or throwing', () => {
    const steps = [null, 'invalid', { components: [null, 'invalid'] }];
    const structure = getComponentStructure({ id: 'wizard', type: 'wizard', steps });

    expect(structure.children).toEqual([]);
    expect(structure.properties.steps).toEqual(steps);
  });
});
