import type { IConfigurationSource, IScriptReview } from '../../types/review';
import { MAX_REVIEW_SCRIPT_LENGTH } from '../../constants/review';
import { inspectConfigurationValue } from './configuration-values';

export const analyzeConfiguration = (script: IConfigurationSource): IScriptReview => {
  if (script.source.length > MAX_REVIEW_SCRIPT_LENGTH) {
    return {
      script,
      complete: false,
      findings: [],
      limitation: 'Configuration value exceeds the 250,000-character review limit.',
    };
  }

  return {
    script,
    complete: true,
    findings: inspectConfigurationValue(script.source, script.propertyName).map((risk) => ({
      rule: risk.rule,
      title: risk.title,
      message: risk.message,
      line: 1,
      column: 1,
      fingerprint: JSON.stringify([risk.rule, script.source]),
      redactions: risk.redact ? [{ start: 0, end: script.source.length }] : undefined,
    })),
  };
};
