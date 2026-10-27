import { parse } from 'acorn';
import type { AnyNode, CallExpression, MemberExpression, Position } from 'acorn';
import { fullAncestor } from 'acorn-walk';
import { MAX_REVIEW_SCRIPT_LENGTH } from '../../constants/review';
import type { IScriptFinding, IScriptReview, IScriptSource } from '../../types/review';
import { collectBindings, isBound } from './console-scope';

const LOG_METHODS = new Set(['log', 'debug', 'info', 'warn', 'error', 'table', 'dir', 'dirxml', 'trace', 'assert', 'group', 'groupCollapsed']);
const PAYLOAD_NAMES = new Set(['data', 'arguments', 'selectedRow', 'parentFormValues', 'globalState', 'formData', 'payload', 'response']);
const SENSITIVE_NAME = /password|passwd|secret|token|authorization|api[_-]?key|email|phone|mobile|identityNumber|saidNumber|passport|firstName|lastName|fullName|dateOfBirth|address|bankAccount/i;
const SENSITIVE_LITERAL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\bBearer\s+\S+|\bsk-[a-z0-9_-]{16,}\b/i;

const propertyName = (node: MemberExpression): string | undefined =>
  !node.computed && node.property.type === 'Identifier' ? node.property.name
    : node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string' ? node.property.value : undefined;

const consoleMethod = (call: CallExpression, ancestors: AnyNode[], bindings: Map<AnyNode, Set<string>>): string | undefined => {
  const callee = call.callee;
  if (callee.type !== 'MemberExpression') return undefined;
  const method = propertyName(callee);
  if (!method || !LOG_METHODS.has(method)) return undefined;
  const receiver = callee.object;
  if (receiver.type === 'Identifier' && receiver.name === 'console' && !isBound('console', ancestors, bindings)) return method;
  if (receiver.type === 'MemberExpression' && propertyName(receiver) === 'console' && receiver.object.type === 'Identifier' &&
      ['window', 'globalThis', 'self'].includes(receiver.object.name) && !isBound(receiver.object.name, ancestors, bindings)) return method;
  return undefined;
};

const sensitiveReason = (call: CallExpression): string | undefined => {
  let reason: string | undefined;
  for (const argument of call.arguments) {
    fullAncestor(argument, (node, _state, ancestors) => {
      const parent = ancestors.at(-2);
      const usedAsObject = parent?.type === 'MemberExpression' && parent.object === node;
      if (node.type === 'Identifier' && SENSITIVE_NAME.test(node.name)) reason = 'An argument references a potentially personal or secret field.';
      if (node.type === 'Identifier' && PAYLOAD_NAMES.has(node.name) && !usedAsObject) reason = 'A complete form, request or response object is passed to the console.';
      if (node.type === 'Literal' && typeof node.value === 'string' && SENSITIVE_LITERAL.test(node.value)) reason = 'An argument contains a potentially personal or secret value.';
      if (node.type === 'MemberExpression') {
        const name = propertyName(node);
        if (name && SENSITIVE_NAME.test(name)) reason = 'An argument references a potentially personal or secret field.';
        if (name === 'data' && !usedAsObject) reason = 'A response or form data object is passed to the console.';
      }
      if (node.type === 'Property' && ((node.key.type === 'Identifier' && SENSITIVE_NAME.test(node.key.name)) ||
          (node.key.type === 'Literal' && typeof node.key.value === 'string' && SENSITIVE_NAME.test(node.key.value)))) {
        reason = 'An argument contains a potentially personal or secret field.';
      }
    });
  }
  return reason;
};

const fingerprint = (node: AnyNode): string => JSON.stringify(node, (key, value: unknown) =>
  ['start', 'end', 'loc', 'raw'].includes(key) ? undefined : typeof value === 'bigint' ? `${value}n` : value);

export const analyzeScript = (script: IScriptSource): IScriptReview => {
  if (script.source.length > MAX_REVIEW_SCRIPT_LENGTH) {
    return { script, findings: [], complete: false, limitation: 'Script exceeds the 250,000-character review limit.' };
  }

  try {
    // Shesha editors accept function bodies. No evaluation or undefined-variable linting is performed.
    const program = parse(script.source, {
      ecmaVersion: 'latest', sourceType: 'script', locations: true,
      allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true,
    });
    const bindings = collectBindings(program);
    const findings: IScriptFinding[] = [];

    fullAncestor(program, (node, _state, ancestors) => {
      if (node.type !== 'CallExpression') return;
      const method = consoleMethod(node, ancestors, bindings);
      if (!method) return;
      const reason = sensitiveReason(node);
      findings.push({
        rule: reason ? 'sensitive-logging' : 'console-usage',
        title: reason ? `Potentially sensitive console.${method}` : `Console usage: console.${method}`,
        message: reason ? `${reason} Review whether personal data or credentials could be exposed; this is a heuristic, not proof of disclosure.`
          : method === 'error' ? 'console.error writes a message; it does not itself throw an exception. Review whether this output is intentional.'
            : 'This call writes to the browser console. Review whether the output is intentional for the deployed form.',
        line: node.loc?.start.line ?? 1,
        column: (node.loc?.start.column ?? 0) + 1,
        fingerprint: fingerprint(node),
      });
    });
    return { script, findings: findings.sort((left, right) => left.line - right.line || left.column - right.column), complete: true };
  } catch (error) {
    if (error instanceof SyntaxError && 'loc' in error) {
      const location = error.loc as Position;
      const message = error.message.replace(/\s*\(\d+:\d+\)$/, '');
      return {
        script, complete: false,
        findings: [{ rule: 'syntax-error', title: 'Script could not be parsed',
          message: `JavaScript parser: ${message}. Check the syntax and the script's actual Shesha editor context.`,
          line: location.line, column: location.column + 1, fingerprint: message }],
      };
    }
    return { script, complete: false, findings: [], limitation: 'The parser could not complete this script review.' };
  }
};
