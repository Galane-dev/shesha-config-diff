import type {
  DiffChangeType,
  IComponentChange,
  IDiffCounts,
  IFormDiff,
  IValueChange,
} from '../../types/diff';
import type { IJsonObject, JsonValue } from '../../types/json';
import type { ISheshaComponent, IUploadedForm } from '../../types/shesha-form';
import { getComponentStructure } from '../forms/component-structure';
import { compareValues } from './compare-values';

interface IIndexedComponent {
  component: ISheshaComponent;
  componentId?: string;
  key: string;
  label: string;
  parentKey: string;
  path: string;
  properties: IJsonObject;
  siblingIndex: number;
  type: string;
}

const getString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const getComponentLabel = (component: ISheshaComponent): string =>
  getString(component.label) ??
  getString(component.componentName) ??
  getString(component.propertyName) ??
  getString(component.type) ??
  getString(component.id) ??
  'Unnamed component';

const createComponentIndex = (components: ISheshaComponent[]): Map<string, IIndexedComponent> => {
  const index = new Map<string, IIndexedComponent>();
  const idOccurrences = new Map<string, number>();

  const visit = (items: ISheshaComponent[], parentKey: string, parentPath: string): void => {
    items.forEach((component, siblingIndex) => {
      const label = getComponentLabel(component);
      const path = parentPath ? `${parentPath} / ${label}` : label;
      const componentId = getString(component.id);
      const occurrence = componentId ? (idOccurrences.get(componentId) ?? 0) + 1 : 1;

      if (componentId) {
        idOccurrences.set(componentId, occurrence);
      }

      const fallbackKey = `${parentKey}/anonymous:${getString(component.type) ?? 'unknown'}:${getString(component.propertyName) ?? label}:${siblingIndex}`;
      const key = componentId ? `id:${componentId}${occurrence > 1 ? `#${occurrence}` : ''}` : fallbackKey;
      const structure = getComponentStructure(component);

      index.set(key, {
        component,
        componentId,
        key,
        label,
        parentKey,
        path,
        properties: structure.properties,
        siblingIndex,
        type: getString(component.type) ?? 'unknown',
      });

      for (const collection of structure.children) {
        const parentKey = collection.key === 'components' ? key : `${key}/${collection.key}`;
        const parentPath = collection.label ? `${path} / ${collection.label}` : path;
        visit(collection.components, parentKey, parentPath);
      }
    });
  };

  visit(components, 'root', '');
  return index;
};

const createLocationChanges = (
  before: IIndexedComponent,
  after: IIndexedComponent,
): IValueChange[] => {
  const changes: IValueChange[] = [];

  if (before.parentKey !== after.parentKey) {
    changes.push({
      after: after.parentKey,
      before: before.parentKey,
      changeType: 'modified',
      id: `${after.key}:@parent`,
      isScript: false,
      path: '@parent',
      propertyName: 'Parent component',
      scope: 'component',
    });
  }

  if (before.siblingIndex !== after.siblingIndex) {
    changes.push({
      after: after.siblingIndex,
      before: before.siblingIndex,
      changeType: 'modified',
      id: `${after.key}:@order`,
      isScript: false,
      path: '@order',
      propertyName: 'Component order',
      scope: 'component',
    });
  }

  return changes;
};

const createSingleComponentChange = (
  item: IIndexedComponent,
  changeType: 'added' | 'removed',
): IComponentChange => ({
  after: changeType === 'added' ? item.component : undefined,
  before: changeType === 'removed' ? item.component : undefined,
  changeType,
  componentId: item.componentId,
  componentType: item.type,
  id: item.key,
  label: item.label,
  path: item.path,
  propertyChanges: [],
});

const compareComponents = (
  beforeForm: IUploadedForm,
  afterForm: IUploadedForm,
): IComponentChange[] => {
  const beforeIndex = createComponentIndex(beforeForm.form.components);
  const afterIndex = createComponentIndex(afterForm.form.components);
  const keys = new Set([...beforeIndex.keys(), ...afterIndex.keys()]);
  const result: IComponentChange[] = [];

  [...keys].sort().forEach((key) => {
    const before = beforeIndex.get(key);
    const after = afterIndex.get(key);

    if (!before && after) {
      result.push(createSingleComponentChange(after, 'added'));
      return;
    }

    if (before && !after) {
      result.push(createSingleComponentChange(before, 'removed'));
      return;
    }

    if (!before || !after) {
      return;
    }

    const locationChanges = createLocationChanges(before, after);
    const propertyChanges = compareValues({
      after: after.properties,
      before: before.properties,
      basePath: '',
      idPrefix: key,
      scope: 'component',
    });
    const allPropertyChanges = [...locationChanges, ...propertyChanges];

    if (allPropertyChanges.length === 0) {
      return;
    }

    const changeType: DiffChangeType = propertyChanges.length === 0 && locationChanges.length > 0
      ? 'moved'
      : 'modified';

    result.push({
      after: after.component,
      before: before.component,
      changeType,
      componentId: after.componentId,
      componentType: after.type,
      id: key,
      label: after.label,
      path: after.path,
      previousPath: before.path !== after.path ? before.path : undefined,
      propertyChanges: allPropertyChanges,
    });
  });

  return result.sort((left, right) => left.path.localeCompare(right.path));
};

const createCounts = (
  componentChanges: IComponentChange[],
  formSettingChanges: IValueChange[],
): IDiffCounts => {
  const propertyChanges = componentChanges.flatMap((change) => change.propertyChanges);
  const allValueChanges = [...propertyChanges, ...formSettingChanges];
  const scripts = allValueChanges.filter((change) => change.isScript).length;

  return {
    added: componentChanges.filter((change) => change.changeType === 'added').length +
      allValueChanges.filter((change) => change.changeType === 'added').length,
    components: componentChanges.length,
    formSettings: formSettingChanges.length,
    modified: componentChanges.filter((change) => change.changeType === 'modified').length +
      allValueChanges.filter((change) => change.changeType === 'modified').length,
    moved: componentChanges.filter((change) => change.changeType === 'moved').length,
    removed: componentChanges.filter((change) => change.changeType === 'removed').length +
      allValueChanges.filter((change) => change.changeType === 'removed').length,
    scripts,
    total: componentChanges.length + formSettingChanges.length + propertyChanges.length,
  };
};

export const compareForms = (beforeForm: IUploadedForm, afterForm: IUploadedForm): IFormDiff => {
  const componentChanges = compareComponents(beforeForm, afterForm);
  const formSettingChanges = compareValues({
    after: afterForm.form.formSettings,
    before: beforeForm.form.formSettings,
    basePath: 'formSettings',
    idPrefix: 'form-settings',
    scope: 'form-setting',
  });
  const scriptChanges = [
    ...componentChanges.flatMap((change) => change.propertyChanges),
    ...formSettingChanges,
  ].filter((change) => change.isScript);
  const counts = createCounts(componentChanges, formSettingChanges);

  return {
    afterMetadata: afterForm.metadata,
    beforeMetadata: beforeForm.metadata,
    componentChanges,
    counts,
    formSettingChanges,
    hasChanges: counts.total > 0,
    scriptChanges,
  };
};
