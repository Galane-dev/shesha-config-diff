import type { DiffFilter, IFormDiff, IValueChange } from '../../types/diff';
import type { IDiffSelection } from '../../types/ui';
import { getChangeLabel } from './change-labels';
import { stringifyJsonValue } from './json-utils';

const createValueSelection = (
  change: IValueChange,
  ownerLabel?: string,
): IDiffSelection => ({
  changeType: change.changeType,
  description: ownerLabel ?? (change.scope === 'form-setting' ? 'Form setting' : 'Component property'),
  id: change.id,
  isScript: change.isScript,
  kind: 'value',
  label: getChangeLabel(change),
  value: change,
});

const matchesSearch = (selection: IDiffSelection, searchText: string): boolean => {
  if (!searchText) {
    return true;
  }

  const valueText = selection.value
    ? `${stringifyJsonValue(selection.value.before)} ${stringifyJsonValue(selection.value.after)}`
    : '';
  const searchable = `${selection.label} ${selection.value?.path ?? ''} ${selection.description} ${selection.changeType} ${valueText}`.toLowerCase();

  return searchable.includes(searchText.toLowerCase());
};

export const createDiffSelections = (
  diff: IFormDiff,
  filter: DiffFilter,
  searchText: string,
): IDiffSelection[] => {
  const components = diff.componentChanges.map<IDiffSelection>((change) => ({
    changeType: change.changeType,
    component: change,
    description: change.componentType,
    id: change.id,
    isScript: change.propertyChanges.some((property) => property.isScript),
    kind: 'component',
    label: change.label,
  }));
  const formSettings = diff.formSettingChanges.map((change) => createValueSelection(change));
  const scriptOwners = new Map<string, string>();

  diff.componentChanges.forEach((component) => {
    component.propertyChanges.forEach((property) => scriptOwners.set(property.id, component.label));
  });

  const scripts = diff.scriptChanges.map((change) =>
    createValueSelection(change, scriptOwners.get(change.id) ?? 'Form settings'),
  );
  const selections = filter === 'components'
    ? components
    : filter === 'form-settings'
      ? formSettings
      : filter === 'scripts'
        ? scripts
        : [...components, ...formSettings];

  return selections.filter((selection) => matchesSearch(selection, searchText));
};
