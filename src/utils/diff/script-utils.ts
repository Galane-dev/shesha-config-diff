import type { JsonValue } from '../../types/json';
import { isJsonObject } from './json-utils';

const SCRIPT_PROPERTY_PATTERN = /(^|\.)(on[A-Z].*|.*(?:code|script|validator|expression|customVisibility|editMode|hidden|disabled|readOnly).*)$/i;

const containsCodeValue = (value: JsonValue | undefined): boolean =>
  isJsonObject(value) && typeof value._code === 'string';

export const isScriptChange = (
  path: string,
  before: JsonValue | undefined,
  after: JsonValue | undefined,
): boolean => SCRIPT_PROPERTY_PATTERN.test(path) || containsCodeValue(before) || containsCodeValue(after);

export const isCodeContainer = (value: JsonValue | undefined): boolean => containsCodeValue(value);
