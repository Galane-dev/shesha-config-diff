import type { JsonValue } from '../../types/json';
import { getArrayEntries } from './array-entries';
import { deepEqual, isJsonObject } from './json-utils';
import { isCodeContainer, isScriptValue } from './script-utils';

interface INestedScriptChange {
  path: string;
  before: JsonValue | undefined;
  after: JsonValue | undefined;
}

interface INestedScriptDiff {
  before: JsonValue | undefined;
  after: JsonValue | undefined;
  scripts: INestedScriptChange[];
}

const mapValues = (
  value: JsonValue | undefined,
  path: string,
  visit: (value: JsonValue, path: string) => JsonValue | undefined,
): JsonValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const mapped = visit(value, path);

  if (mapped === undefined || isCodeContainer(mapped)) {
    return mapped;
  }

  if (Array.isArray(mapped)) {
    // IDs keep scripts matched when buttons move or new actions are inserted.
    return getArrayEntries(mapped, path).map((entry) => mapValues(entry.value, entry.path, visit) ?? null);
  }

  if (isJsonObject(mapped)) {
    return Object.fromEntries(Object.entries(mapped)
      .map(([key, item]): [string, JsonValue | undefined] => [key, mapValues(item, path ? `${path}.${key}` : key, visit)])
      .filter(([, item]) => item !== undefined));
  }

  return mapped;
};

export const extractNestedScriptDiff = (
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  path: string,
): INestedScriptDiff => {
  const scriptPaths = new Set<string>();
  const collectValues = (value: JsonValue | undefined): Map<string, JsonValue> => {
    const values = new Map<string, JsonValue>();
    mapValues(value, path, (item, itemPath) => {
      values.set(itemPath, item);

      if (isScriptValue(itemPath, item)) {
        scriptPaths.add(itemPath);
      }

      return item;
    });
    return values;
  };

  const beforeValues = collectValues(before);
  const afterValues = collectValues(after);

  if (scriptPaths.size === 0) {
    return { before, after, scripts: [] };
  }

  // Remove the same script paths from both sides so their changes are reported only once.
  const scriptRoots = new Set<string>();
  const stripScript = (item: JsonValue, itemPath: string): JsonValue | undefined => {
    if (scriptPaths.has(itemPath)) {
      scriptRoots.add(itemPath);
      return undefined;
    }

    return item;
  };
  const beforeMetadata = mapValues(before, path, stripScript);
  const afterMetadata = mapValues(after, path, stripScript);

  return {
    before: beforeMetadata,
    after: afterMetadata,
    scripts: [...scriptRoots].sort()
      .filter((itemPath) => !deepEqual(beforeValues.get(itemPath), afterValues.get(itemPath)))
      .map((itemPath) => ({ path: itemPath, before: beforeValues.get(itemPath), after: afterValues.get(itemPath) })),
  };
};
