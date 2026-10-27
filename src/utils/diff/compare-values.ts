import type { DiffScope, IValueChange } from '../../types/diff';
import type { IJsonObject, JsonValue } from '../../types/json';
import { deepEqual, isJsonObject } from './json-utils';
import { isCodeContainer, isScriptChange } from './script-utils';

interface ICompareValueOptions {
  after: JsonValue | undefined;
  before: JsonValue | undefined;
  basePath: string;
  idPrefix: string;
  scope: DiffScope;
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
): IValueChange => {
  const propertyName = path.split('.').at(-1) ?? path;
  const changeType = before === undefined ? 'added' : after === undefined ? 'removed' : 'modified';

  return {
    after,
    before,
    changeType,
    id: `${idPrefix}:${path}`,
    isScript: isScriptChange(path, before, after),
    path,
    propertyName,
    scope,
  };
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
  const { after, before, basePath, idPrefix, scope } = options;

  if (deepEqual(before, after)) {
    return [];
  }

  if (
    isJsonObject(before) &&
    isJsonObject(after) &&
    !isCodeContainer(before) &&
    !isCodeContainer(after)
  ) {
    return compareObjectProperties(before, after, options);
  }

  return [createValueChange(idPrefix, scope, basePath, before, after)];
};
