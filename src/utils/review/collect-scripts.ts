import type { JsonValue } from '../../types/json';
import type { IScriptSource, ReviewSource } from '../../types/review';
import type { ISheshaComponent, ISheshaFormExport } from '../../types/shesha-form';
import { getArrayEntries } from '../diff/array-entries';
import { formatPropertyLabel } from '../diff/change-labels';
import { isJsonObject } from '../diff/json-utils';
import { isScriptValue } from '../diff/script-utils';
import { getComponentStructure } from '../forms/component-structure';
import { inspectConfigurationValue } from './configuration-values';
import { getScriptContext } from './script-context';

const EXTRA_SCRIPT_FIELDS = new Set(['formArguments', 'prepareSubmitData']);

const collectSources = (form: ISheshaFormExport, includeConfiguration: boolean): ReviewSource[] => {
  const scripts: ReviewSource[] = [];
  const occurrences = new Map<string, number>();

  const visit = (
    value: JsonValue | undefined,
    path: string,
    labels: string[],
    ownerId: string,
    propertyHint?: string,
  ): void => {
    if (isJsonObject(value) && ('_code' in value || '_mode' in value)) {
      // A value-mode setting may retain inactive code from an earlier edit.
      if (
        (value._mode === undefined || value._mode === 'code') &&
        typeof value._code === 'string' &&
        value._code.trim()
      ) {
        scripts.push({
          id: `${ownerId}:${path}`,
          label: labels.filter(Boolean).join(' / '),
          path,
          source: value._code,
          ...getScriptContext(path, true),
        });
      } else if (includeConfiguration && value._mode === 'value') {
        visit(value._value, `${path}._value`, labels, ownerId, path.split('.').at(-1));
      }
      return;
    }

    const property = propertyHint ?? path.split('.').at(-1) ?? path;
    if (
      typeof value === 'string' &&
      value.trim() &&
      (isScriptValue(path, value) ||
        EXTRA_SCRIPT_FIELDS.has(property) ||
        /CustomEnabled$/.test(property))
    ) {
      scripts.push({
        id: `${ownerId}:${path}`,
        label: labels.filter(Boolean).join(' / '),
        path,
        source: value,
        ...getScriptContext(path),
      });
      return;
    }

    if (
      includeConfiguration &&
      typeof value === 'string' &&
      inspectConfigurationValue(value, property).length > 0
    ) {
      scripts.push({
        id: `${ownerId}:configuration:${path}`,
        kind: 'configuration',
        propertyName: property,
        label: labels.filter(Boolean).join(' / '),
        path,
        source: value,
      });
      return;
    }

    if (Array.isArray(value)) {
      for (const entry of getArrayEntries(value, path)) {
        visit(entry.value, entry.path, [...labels, entry.label], ownerId);
      }
    } else if (isJsonObject(value)) {
      for (const [key, item] of Object.entries(value)) {
        visit(item, path ? `${path}.${key}` : key, [...labels, formatPropertyLabel(key)], ownerId);
      }
    }
  };

  const visitComponents = (
    components: ISheshaComponent[],
    parentPath: string,
    labels: string[],
  ): void => {
    for (const entry of getArrayEntries(components, parentPath)) {
      if (!isJsonObject(entry.value)) {
        continue;
      }
      const component = entry.value;
      const label =
        [component.label, component.componentName, component.propertyName, component.type].find(
          (candidate): candidate is string =>
            typeof candidate === 'string' && candidate.trim().length > 0,
        ) ?? entry.label;
      const id =
        typeof component.id === 'string' && component.id.trim() ? component.id : entry.path;
      const occurrence = (occurrences.get(id) ?? 0) + 1;
      occurrences.set(id, occurrence);
      const ownerId = JSON.stringify([id, occurrence]);
      const structure = getComponentStructure(component);
      const componentLabels = [...labels, label];

      visit(structure.properties, '', componentLabels, ownerId);
      for (const children of structure.children) {
        visitComponents(
          children.components,
          `${entry.path}.${children.key}`,
          children.label ? [...componentLabels, children.label] : componentLabels,
        );
      }
    }
  };

  visitComponents(form.components, 'components', []);
  visit(form.formSettings, 'formSettings', ['Form settings'], 'form-settings');
  return scripts;
};

export const collectScripts = (form: ISheshaFormExport): IScriptSource[] =>
  collectSources(form, false).filter(
    (source): source is IScriptSource => source.kind !== 'configuration',
  );

export const collectReviewSources = (form: ISheshaFormExport): ReviewSource[] =>
  collectSources(form, true);
