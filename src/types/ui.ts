import type { DiffChangeType, IComponentChange, IValueChange } from './diff';

export interface IDiffSelection {
  changeType: DiffChangeType;
  component?: IComponentChange;
  description: string;
  id: string;
  isScript: boolean;
  kind: 'component' | 'value';
  label: string;
  value?: IValueChange;
}
