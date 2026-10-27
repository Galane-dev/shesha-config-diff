import type { IScriptSource } from '../../types/review';

const ASYNC_HOOKS = new Set([
  'onBeforeDataLoad',
  'onAfterDataLoad',
  'onBeforeSubmit',
  'onPrepareSubmitData',
  'onSubmitSuccess',
  'onSubmitFailed',
  'onValuesUpdate',
  'onSubmitData',
  'prepareSubmitData',
]);
const COMPLETION_HOOKS = new Set([
  'onBeforeDataLoad',
  'onAfterDataLoad',
  'onBeforeSubmit',
  'onPrepareSubmitData',
  'onSubmitData',
  'prepareSubmitData',
]);
const SYNC_FIELDS = new Set(['hidden', 'disabled', 'readOnly', 'editMode', 'customVisibility']);

export const getScriptContext = (
  path: string,
  dynamicSetting = false,
): Pick<IScriptSource, 'executionContext' | 'requiresCompletion'> => {
  const parts = path.split('.');
  const property = parts.at(-1) ?? path;
  const wizardGate = parts.some((part) =>
    /^before(?:Next|Done|Back|Previous|Cancel)ActionConfiguration$/.test(part),
  );
  if (property === 'expression' && wizardGate) {
    return { executionContext: 'async', requiresCompletion: true };
  }
  if (ASYNC_HOOKS.has(property)) {
    return { executionContext: 'async', requiresCompletion: COMPLETION_HOOKS.has(property) };
  }
  if (dynamicSetting || SYNC_FIELDS.has(property) || /CustomEnabled$/.test(property)) {
    return { executionContext: 'sync' };
  }
  return { executionContext: 'unknown' };
};
