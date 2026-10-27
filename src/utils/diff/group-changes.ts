import type { IValueChange } from '../../types/diff';
import { getPropertyLabel } from './change-labels';

export interface IChangePanel {
  key: string;
  label: string;
  path: string;
  changeCount: number;
  change?: IValueChange;
  children: IChangePanel[];
}

export const groupChanges = (changes: IValueChange[]): IChangePanel[] => {
  const panels: IChangePanel[] = [];
  const groups = new Map<string, IChangePanel>();

  for (const change of changes) {
    let children = panels;

    for (const group of change.groups ?? []) {
      let panel = groups.get(group.path);

      if (!panel) {
        panel = { key: `group:${group.path}`, label: group.label, path: group.path, changeCount: 0, children: [] };
        groups.set(group.path, panel);
        children.push(panel);
      }

      panel.changeCount += 1;
      children = panel.children;
    }

    children.push({
      key: change.id,
      label: getPropertyLabel(change),
      path: change.path,
      changeCount: 1,
      change,
      children: [],
    });
  }

  return panels;
};
