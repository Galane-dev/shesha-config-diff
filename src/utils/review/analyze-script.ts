import { parse } from 'acorn';
import type { Position } from 'acorn';
import { MAX_REVIEW_SCRIPT_LENGTH } from '../../constants/review';
import type { IScriptFinding, IScriptReview, IScriptSource } from '../../types/review';
import { fingerprint } from './ast-utils';
import { reviewAsyncWork } from './rules/async-work';
import { reviewConfigurationRisks } from './rules/configuration-risks';
import { reviewConsoleUsage } from './rules/console-usage';
import { reviewErrorHandling } from './rules/error-handling';
import { reviewRuntimeAccess } from './rules/runtime-access';
import type { IRuleContext, ScriptReviewRule } from './rules/types';
import { collectScopes } from './scope';
import { getScriptContext } from './script-context';

const SCRIPT_RULES: ScriptReviewRule[] = [
  reviewConsoleUsage,
  reviewErrorHandling,
  reviewAsyncWork,
  reviewRuntimeAccess,
  reviewConfigurationRisks,
];

export const analyzeScript = (source: IScriptSource): IScriptReview => {
  const script = { ...getScriptContext(source.path), ...source };
  if (script.source.length > MAX_REVIEW_SCRIPT_LENGTH) {
    return {
      script,
      findings: [],
      complete: false,
      limitation: 'Script exceeds the 250,000-character review limit.',
    };
  }
  try {
    const program = parse(script.source, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true,
      allowReturnOutsideFunction: true,
      allowAwaitOutsideFunction: script.executionContext !== 'sync',
    });
    const findings: IScriptFinding[] = [];
    const reported = new Set<string>();
    const context: IRuleContext = {
      program,
      script,
      scopes: collectScopes(program),
      report: (rule, node, details) => {
        const key = `${rule}:${node.start}:${node.end}:${details.title}`;
        if (reported.has(key)) {
          return;
        }
        reported.add(key);
        findings.push({
          ...details,
          rule,
          line: node.loc?.start.line ?? 1,
          column: (node.loc?.start.column ?? 0) + 1,
          fingerprint: fingerprint(node),
        });
      },
    };
    SCRIPT_RULES.forEach((rule) => rule(context));
    return {
      script,
      findings: findings.sort(
        (left, right) => left.line - right.line || left.column - right.column,
      ),
      complete: true,
    };
  } catch (error) {
    if (error instanceof SyntaxError && 'loc' in error) {
      const location = error.loc as Position;
      const message = error.message.replace(/\s*\(\d+:\d+\)$/, '');
      const execution =
        script.executionContext === 'unknown'
          ? 'an inferred function body'
          : `a ${script.executionContext ?? 'unknown'} function body`;
      return {
        script,
        complete: false,
        findings: [
          {
            rule: 'syntax-error',
            title: 'Script could not be parsed',
            message: `JavaScript parser: ${message}. This field is reviewed as ${execution}. Check the syntax and the script's actual Shesha editor context.`,
            line: location.line,
            column: location.column + 1,
            fingerprint: message,
          },
        ],
      };
    }
    return {
      script,
      complete: false,
      findings: [],
      limitation: 'The parser could not complete this script review.',
    };
  }
};
