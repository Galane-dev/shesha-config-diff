import type { DiffScope, IChangeGroup, IValueChange } from '../../types/diff';
import type { IJsonObject, JsonValue } from '../../types/json';
import { getArrayEntries } from './array-entries';
import { formatPropertyLabel } from './change-labels';
import { deepEqual, isJsonObject } from './json-utils';
import { extractNestedScriptDiff } from './nested-scripts';
import { isCodeContainer, isScriptChange, isScriptValue } from './script-utils';

interface ICompareValueOptions {
  after: JsonValue | undefined;
  before: JsonValue | undefined;
  basePath: string;
  idPrefix: string;
  scope: DiffScope;
  groups?: IChangeGroup[];
  skipProperties?: Set<string>;
}

const joinPath = (basePath: string, propertyName: string): string =>
  basePath ? `${basePath}.${propertyName}` : propertyName;

const createValueChange = (
  idPrefix: string,
  scope: DiffScope,
  path: string,
  before: JsonValue | undefined,
  after: JsonValue | undefined,
  groups?: IChangeGroup[],
): IValueChange => {
  const propertyName = path.split('.').at(-1) ?? path;
  const changeType = before === undefined ? 'added' : after === undefined ? 'removed' : 'modified';

  return {
    after,
    before,
    changeType,
    id: `${idPrefix}:${path}`,
    ...(groups?.length ? { groups } : {}),
    isScript: groups?.length
      ? isScriptValue(path, before ?? null) || isScriptValue(path, after ?? null)
      : isScriptChange(path, before, after),
    path,
    propertyName,
    scope,
  };
};

const compareConfigurationItems = (options: ICompareValueOptions): IValueChange[] | undefined => {
  const { before, after, basePath, idPrefix, scope, groups = [] } = options;
  const collectionName = basePath.split('.').at(-1) ?? basePath;

  // Split configured entries, not arbitrary data or primitive arrays.
  if (!['items', 'buttons', 'actions', 'steps'].includes(collectionName) ||
      (before !== undefined && !Array.isArray(before)) ||
      (after !== undefined && !Array.isArray(after))) {
    return undefined;
  }

  const beforeItems = Array.isArray(before) ? before : [];
  const afterItems = Array.isArray(after) ? after : [];

  if (beforeItems.length + afterItems.length === 0 ||
      ![...beforeItems, ...afterItems].every((item) => isJsonObject(item) && !isCodeContainer(item) &&
        ['id', 'key', 'label', 'title', 'caption', 'name', 'propertyName', 'actionName', 'actionConfiguration', 'actionArguments']
          .some((key) => key in item))) {
    return undefined;
  }

  const beforeEntries = new Map(getArrayEntries(beforeItems, basePath).map((entry) => [entry.path, entry]));
  const afterEntries = new Map(getArrayEntries(afterItems, basePath).map((entry) => [entry.path, entry]));
  const collectionGroups = [...groups, { path: basePath, label: formatPropertyLabel(collectionName) }];
  const paths = new Set([...afterEntries.keys(), ...beforeEntries.keys()]);
  const changes = [...paths].flatMap((path) => {
    const oldItem = beforeEntries.get(path);
    const newItem = afterEntries.get(path);

    return compareValues({
      ...options,
      before: oldItem?.value,
      after: newItem?.value,
      basePath: path,
      groups: [...collectionGroups, { path, label: newItem?.label ?? oldItem?.label ?? 'Item' }],
    });
  });
  const commonBefore = [...beforeEntries.keys()].filter((path) => afterEntries.has(path));
  const commonAfter = [...afterEntries.keys()].filter((path) => beforeEntries.has(path));

  // Inserting a button is not a move of every button after it. Compare relative order of shared items.
  if (!deepEqual(commonBefore, commonAfter)) {
    const describeOrder = (entries: typeof beforeEntries): JsonValue[] => [...entries.values()]
      .map((entry) => ({ item: entry.label, identity: entry.path }));
    changes.unshift(createValueChange(idPrefix, scope, `${basePath}.@order`,
      describeOrder(beforeEntries), describeOrder(afterEntries), collectionGroups));
  }

  return changes;
};

const compareObjectProperties = (
  before: IJsonObject,
  after: IJsonObject,
  options: ICompareValueOptions,
): IValueChange[] => {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  return [...keys]
    .filter((key) => !options.skipProperties?.has(key))
    .sort()
    .flatMap((key) => compareValues({
      ...options,
      after: after[key],
      before: before[key],
      basePath: joinPath(options.basePath, key),
      skipProperties: undefined,
    }));
};

export const compareValues = (options: ICompareValueOptions): IValueChange[] => {
  const { after, before, basePath, idPrefix, scope, groups } = options;

  if (deepEqual(before, after)) {
    return [];
  }

  const beforeObject = isJsonObject(before) && !isCodeContainer(before) ? before : undefined;
  const afterObject = isJsonObject(after) && !isCodeContainer(after) ? after : undefined;
  const addedOrRemovedSettings = groups?.length &&
    ((before === undefined && afterObject) || (after === undefined && beforeObject));

  if ((beforeObject && afterObject) || addedOrRemovedSettings) {
    const changes = compareObjectProperties(beforeObject ?? {}, afterObject ?? {}, options);

    // An added/removed empty settings object is still a real change.
    return changes.length > 0 ? changes : [createValueChange(idPrefix, scope, basePath, before, after, groups)];
  }

  const itemChanges = compareConfigurationItems(options);

  if (itemChanges) {
    return itemChanges;
  }

  if (
    (Array.isArray(before) || Array.isArray(after) || isJsonObject(before) || isJsonObject(after)) &&
    !isCodeContainer(before) && !isCodeContainer(after)
  ) {
    const nested = extractNestedScriptDiff(before, after, basePath);
    const changes = nested.scripts.map((script) =>
      createValueChange(idPrefix, scope, script.path, script.before, script.after, groups),
    );

    if (!deepEqual(nested.before, nested.after)) {
      changes.unshift(createValueChange(idPrefix, scope, basePath, nested.before, nested.after, groups));
    }

    return changes;
  }

  return [createValueChange(idPrefix, scope, basePath, before, after, groups)];
};
