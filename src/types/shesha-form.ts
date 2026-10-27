import type { IJsonObject } from './json';

export interface ISheshaComponent extends IJsonObject {
  componentName?: string;
  components?: ISheshaComponent[];
  id?: string;
  label?: string;
  parentId?: string;
  propertyName?: string;
  type?: string;
}

export interface ISheshaFormExport extends IJsonObject {
  components: ISheshaComponent[];
  formSettings: IJsonObject;
}

export interface IFormMetadata {
  configName?: string;
  displayName: string;
  fileName: string;
  fileSize: number;
  modelType?: string;
  moduleName?: string;
  schemaVersion?: number | string;
}

export interface IUploadedForm {
  form: ISheshaFormExport;
  metadata: IFormMetadata;
  warnings: string[];
}

export interface IFormParseResult {
  error?: string;
  uploadedForm?: IUploadedForm;
}
