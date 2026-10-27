import type { IValueChange } from '../../types/diff';

const PROPERTY_LABELS: Record<string, string> = {
  '@order': 'Order',
  '@parent': 'Parent component',
  actionArguments: '',
  actionConfiguration: 'Action',
  beforeDoneActionConfiguration: 'Before Done',
  beforeNextActionConfiguration: 'Before Next',
  expression: 'Script',
};

export const formatPropertyLabel = (path: string): string => path.split('.')
  .map((part) => PROPERTY_LABELS[part] ?? part
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase()))
  .filter(Boolean)
  .join(' / ');

export const getPropertyLabel = (change: IValueChange): string => {
  const group = change.groups?.at(-1);
  const path = group ? change.path.slice(group.path.length).replace(/^\./, '') : change.path;

  return path ? formatPropertyLabel(path) : 'Settings';
};

export const getChangeLabel = (change: IValueChange): string => change.groups?.length
  ? [...change.groups.map((group) => group.label), getPropertyLabel(change)].join(' / ')
  : change.path;
