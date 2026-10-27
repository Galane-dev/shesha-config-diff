import type { JsonValue } from './json';
import type { IFormMetadata, ISheshaComponent } from './shesha-form';

export type DiffChangeType = 'added' | 'modified' | 'moved' | 'removed';
export type DiffScope = 'component' | 'form-setting';
export type DiffFilter = 'all' | 'components' | 'form-settings' | 'scripts';
export type DiffViewMode = 'side-by-side' | 'inline';

export interface IValueChange {
  after?: JsonValue;
  before?: JsonValue;
  changeType: Exclude<DiffChangeType, 'moved'>;
  id: string;
  isScript: boolean;
  path: string;
  propertyName: string;
  scope: DiffScope;
}

export interface IComponentChange {
  after?: ISheshaComponent;
  before?: ISheshaComponent;
  changeType: DiffChangeType;
  componentId?: string;
  componentType: string;
  id: string;
  label: string;
  path: string;
  previousPath?: string;
  propertyChanges: IValueChange[];
}

export interface IDiffCounts {
  added: number;
  components: number;
  formSettings: number;
  modified: number;
  moved: number;
  removed: number;
  scripts: number;
  total: number;
}

export interface IFormDiff {
  afterMetadata: IFormMetadata;
  beforeMetadata: IFormMetadata;
  componentChanges: IComponentChange[];
  counts: IDiffCounts;
  formSettingChanges: IValueChange[];
  hasChanges: boolean;
  scriptChanges: IValueChange[];
}

export interface ILineDiffEntry {
  content: string;
  lineNumberAfter?: number;
  lineNumberBefore?: number;
  type: 'added' | 'context' | 'removed';
}

export interface ISideBySideDiffRow {
  before?: ILineDiffEntry;
  after?: ILineDiffEntry;
}
