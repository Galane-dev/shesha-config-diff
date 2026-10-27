import type { IJsonObject, JsonValue } from '../../types/json';

export const isJsonObject = (value: JsonValue | undefined): value is IJsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const deepEqual = (left: JsonValue | undefined, right: JsonValue | undefined): boolean => {
  if (left === right) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => deepEqual(value, right[index]));
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key, index) => key === rightKeys[index] && deepEqual(left[key], right[key]))
    );
  }

  return false;
};

export const canonicalizeJson = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (isJsonObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<IJsonObject>((result, key) => {
        const propertyValue = value[key];

        if (propertyValue !== undefined) {
          result[key] = canonicalizeJson(propertyValue);
        }

        return result;
      }, {});
  }

  return value;
};

export const stringifyJsonValue = (value: JsonValue | undefined): string => {
  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(canonicalizeJson(value), null, 2);
};
