import type { JsonValue } from '../../types/json';
import { isJsonObject } from './json-utils';

const SCRIPT_PROPERTY_PATTERN = /(^|\.)(on[A-Z].*|.*(?:code|script|validator|expression|customVisibility|editMode|hidden|disabled|readOnly).*)$/i;
const STATIC_EDIT_MODES = new Set(['inherited', 'editable', 'readonly']);
const SCRIPT_VALUE_PROPERTY_PATTERN = /^(on[A-Z].*|(?:[a-zA-Z]+)?(?:Script|Expression|Validator)|script|expression|validator|customVisibility|editMode|hidden|disabled|readOnly)$/;

const containsCodeValue = (value: JsonValue | undefined): boolean =>
  isJsonObject(value) && typeof value._code === 'string';

export const isScriptChange = (
  path: string,
  before: JsonValue | undefined,
  after: JsonValue | undefined,
): boolean => SCRIPT_PROPERTY_PATTERN.test(path.split('.').at(-1) ?? path) || containsCodeValue(before) || containsCodeValue(after);

export const isCodeContainer = (value: JsonValue | undefined): boolean => containsCodeValue(value);

export const isScriptValue = (path: string, value: JsonValue): boolean => {
  if (containsCodeValue(value)) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const property = path.split('.').at(-1) ?? path;
  // Plain data fields such as code and description are not executable scripts.
  return SCRIPT_VALUE_PROPERTY_PATTERN.test(property) &&
    !(property.toLowerCase() === 'editmode' && STATIC_EDIT_MODES.has(value.toLowerCase()));
};
