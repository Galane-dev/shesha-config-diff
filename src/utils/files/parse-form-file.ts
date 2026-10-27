import { MAX_FILE_SIZE_BYTES } from '../../constants/app';
import type { IJsonObject, JsonValue } from '../../types/json';
import type {
  IFormMetadata,
  IFormParseResult,
  ISheshaComponent,
  ISheshaFormExport,
  IUploadedForm,
} from '../../types/shesha-form';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isComponent = (value: unknown): value is ISheshaComponent => isRecord(value);

const isFormExport = (value: unknown): value is ISheshaFormExport => {
  if (!isRecord(value) || !Array.isArray(value.components) || !isRecord(value.formSettings)) {
    return false;
  }

  return value.components.every(isComponent);
};

const getOptionalString = (value: JsonValue | undefined): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const getOptionalVersion = (value: JsonValue | undefined): number | string | undefined =>
  typeof value === 'number' || typeof value === 'string' ? value : undefined;

const cleanExportName = (fileName: string): string => fileName
  .replace(/\.json$/i, '')
  .replace(/\s+-\s+\d{4}-\d{2}-\d{2}T[\d.]+$/i, '')
  .replace(/\s+\(\d+\)$/i, '')
  .trim();

const createMetadata = (
  fileName: string,
  fileSize: number,
  formSettings: IJsonObject,
): IFormMetadata => {
  const cleanedName = cleanExportName(fileName);
  const separatorIndex = cleanedName.lastIndexOf('.');
  const moduleName = separatorIndex > 0 ? cleanedName.slice(0, separatorIndex) : undefined;
  const configName = separatorIndex > 0 ? cleanedName.slice(separatorIndex + 1) : cleanedName;

  return {
    configName,
    displayName: configName || cleanedName || fileName,
    fileName,
    fileSize,
    modelType: getOptionalString(formSettings.modelType),
    moduleName,
    schemaVersion: getOptionalVersion(formSettings.version),
  };
};

const collectComponentIdWarnings = (components: ISheshaComponent[]): string[] => {
  const idCounts = new Map<string, number>();
  let componentsWithoutIds = 0;

  const visit = (items: ISheshaComponent[]): void => {
    items.forEach((component) => {
      if (component.id?.trim()) {
        idCounts.set(component.id, (idCounts.get(component.id) ?? 0) + 1);
      } else {
        componentsWithoutIds += 1;
      }

      if (Array.isArray(component.components)) {
        visit(component.components);
      }
    });
  };

  visit(components);

  const duplicateIds = [...idCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  const warnings: string[] = [];

  if (componentsWithoutIds > 0) {
    warnings.push(`${componentsWithoutIds} component(s) have no ID and will be matched by location.`);
  }

  if (duplicateIds.length > 0) {
    warnings.push(`Duplicate component IDs found: ${duplicateIds.join(', ')}.`);
  }

  return warnings;
};

export const parseSheshaForm = (
  content: string,
  fileName: string,
  fileSize = new Blob([content]).size,
): IFormParseResult => {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { error: 'The selected file is larger than 15 MB.' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return { error: 'The selected file is not valid JSON.' };
  }

  if (!isFormExport(parsed)) {
    return {
      error: 'This does not look like a Shesha form export. Expected components and formSettings.',
    };
  }

  const uploadedForm: IUploadedForm = {
    form: parsed,
    metadata: createMetadata(fileName, fileSize, parsed.formSettings),
    warnings: collectComponentIdWarnings(parsed.components),
  };

  return { uploadedForm };
};

export const readSheshaFormFile = async (file: File): Promise<IFormParseResult> => {
  if (!file.name.toLowerCase().endsWith('.json')) {
    return { error: 'Select a JSON form export.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: 'The selected file is larger than 15 MB.' };
  }

  try {
    return parseSheshaForm(await file.text(), file.name, file.size);
  } catch {
    return { error: 'The file could not be read.' };
  }
};
