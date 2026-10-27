import type { IJsonObject, JsonValue } from '../../types/json';
import type { ISheshaComponent } from '../../types/shesha-form';
import { isJsonObject } from '../diff/json-utils';

interface IChildComponentCollection {
  components: ISheshaComponent[];
  key: string;
  label?: string;
}

interface IComponentStructure {
  children: IChildComponentCollection[];
  properties: IJsonObject;
}

const getString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

export const getComponentStructure = (component: ISheshaComponent): IComponentStructure => {
  const children: IChildComponentCollection[] = [];

  const extractChildren = (container: IJsonObject, key: string, label?: string): IJsonObject => {
    const components = container.components;

    if (!Array.isArray(components) || !components.every(isJsonObject)) {
      return container;
    }

    children.push({ components, key, label });
    return Object.fromEntries(Object.entries(container).filter(([name]) => name !== 'components'));
  };

  // Only structural slots contain child components; ordinary configuration arrays stay intact.
  let properties = extractChildren(component, 'components');

  for (const name of ['steps', 'tabs', 'columns']) {
    const slots = properties[name];

    if (!Array.isArray(slots)) {
      continue;
    }

    const idOccurrences = new Map<string, number>();

    properties = {
      ...properties,
      [name]: slots.map((slot, index) => {
        if (!isJsonObject(slot)) {
          return slot;
        }

        const id = getString(slot.id) ?? getString(slot.key);
        const occurrence = id ? (idOccurrences.get(id) ?? 0) + 1 : 1;

        if (id) {
          idOccurrences.set(id, occurrence);
        }

        const slotKey = id ? `id:${id}${occurrence > 1 ? `#${occurrence}` : ''}` : `index:${index}`;
        const key = `${name}[${slotKey}].components`;
        const label = getString(slot.label) ?? getString(slot.title) ?? getString(slot.name) ?? `${name}[${index}]`;
        return extractChildren(slot, key, label);
      }),
    };
  }

  for (const name of ['header', 'content']) {
    const slot = properties[name];

    if (isJsonObject(slot)) {
      properties = {
        ...properties,
        [name]: extractChildren(slot, `${name}.components`, name === 'header' ? 'Header' : 'Content'),
      };
    }
  }

  return { children, properties };
};
