import type { JsonValue } from '../../types/json';
import { isJsonObject } from './json-utils';

interface IArrayEntry {
  label: string;
  path: string;
  value: JsonValue;
}

export const getArrayEntries = (items: JsonValue[], path: string): IArrayEntry[] => {
  const occurrences = new Map<string, number>();
  const isStepCollection = path.split('.').at(-1) === 'steps';

  return items.map((value, index) => {
    const identifier = isJsonObject(value)
      ? ['id', 'key'].find((property) => typeof value[property] === 'string' && value[property].trim().length > 0)
      : undefined;
    const identity = identifier && isJsonObject(value) ? `${identifier}=${JSON.stringify(value[identifier])}` : undefined;
    const occurrence = identity ? (occurrences.get(identity) ?? 0) + 1 : 1;

    if (identity) {
      occurrences.set(identity, occurrence);
    }

    const selector = identity
      ? `${identity}${occurrence > 1 ? `,occurrence=${occurrence}` : ''}`
      : index;
    const action = isJsonObject(value) && isJsonObject(value.actionConfiguration) ? value.actionConfiguration : undefined;
    const actionArguments = isJsonObject(action?.actionArguments) ? action.actionArguments : undefined;
    const label = isJsonObject(value)
      ? (isStepCollection ? [value.title, value.label, value.name] : [
        value.label, value.title, value.caption, value.name, value.actionName,
        actionArguments?.modalTitle, actionArguments?.title, value.propertyName, action?.actionName,
      ])
        .find((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
      : undefined;
    const displayLabel = isStepCollection
      ? `Step ${index + 1}${label ? ` - ${label}` : ''}`
      : label ?? `Item ${index + 1}`;

    return { label: displayLabel, path: `${path}[${selector}]`, value };
  });
};
