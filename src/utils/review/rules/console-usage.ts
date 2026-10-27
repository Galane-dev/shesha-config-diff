import type { AnyNode, CallExpression } from 'acorn';
import { fullAncestor } from 'acorn-walk';
import { propertyName } from '../ast-utils';
import { isBound } from '../scope';
import type { IScopeInfo } from '../scope';
import type { ScriptReviewRule } from './types';

const LOG_METHODS = new Set([
  'log',
  'debug',
  'info',
  'warn',
  'error',
  'table',
  'dir',
  'dirxml',
  'trace',
  'assert',
  'group',
  'groupCollapsed',
]);
const PAYLOAD_NAMES = new Set([
  'data',
  'arguments',
  'selectedRow',
  'parentFormValues',
  'globalState',
  'formData',
  'payload',
  'response',
]);
const SENSITIVE_NAME =
  /password|passwd|secret|token|authorization|api[_-]?key|email|phone|mobile|identityNumber|saidNumber|passport|firstName|lastName|fullName|dateOfBirth|address|bankAccount/i;
const SENSITIVE_LITERAL =
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|^\s*Bearer\s+\S+\s*$|\bsk-[a-z0-9_-]{16,}\b/i;

export const consoleMethod = (
  call: CallExpression,
  ancestors: AnyNode[],
  scopes: IScopeInfo,
): string | undefined => {
  const callee = call.callee;
  if (callee.type !== 'MemberExpression') {
    return undefined;
  }
  const method = propertyName(callee);
  if (!method || !LOG_METHODS.has(method)) {
    return undefined;
  }
  const receiver = callee.object;
  if (
    receiver.type === 'Identifier' &&
    receiver.name === 'console' &&
    !isBound('console', ancestors, scopes.bindings)
  ) {
    return method;
  }
  if (
    receiver.type === 'MemberExpression' &&
    propertyName(receiver) === 'console' &&
    receiver.object.type === 'Identifier' &&
    ['window', 'globalThis', 'self'].includes(receiver.object.name) &&
    !isBound(receiver.object.name, ancestors, scopes.bindings)
  ) {
    return method;
  }
  return undefined;
};

const sensitiveReason = (call: CallExpression): string | undefined => {
  let reason: string | undefined;
  for (const argument of call.arguments) {
    fullAncestor(argument, (node, _state, ancestors) => {
      const parent = ancestors.at(-2);
      const usedAsObject = parent?.type === 'MemberExpression' && parent.object === node;
      if (node.type === 'Identifier' && SENSITIVE_NAME.test(node.name)) {
        reason = 'An argument references a potentially personal or secret field.';
      }
      if (node.type === 'Identifier' && PAYLOAD_NAMES.has(node.name) && !usedAsObject) {
        reason = 'A complete form, request or response object is passed to the console.';
      }
      if (
        node.type === 'Literal' &&
        typeof node.value === 'string' &&
        SENSITIVE_LITERAL.test(node.value)
      ) {
        reason = 'An argument contains a potentially personal or secret value.';
      }
      if (node.type === 'MemberExpression') {
        const name = propertyName(node);
        if (name && SENSITIVE_NAME.test(name)) {
          reason = 'An argument references a potentially personal or secret field.';
        }
        if (name === 'data' && !usedAsObject) {
          reason = 'A response or form data object is passed to the console.';
        }
      }
      if (
        node.type === 'Property' &&
        ((node.key.type === 'Identifier' && SENSITIVE_NAME.test(node.key.name)) ||
          (node.key.type === 'Literal' &&
            typeof node.key.value === 'string' &&
            SENSITIVE_NAME.test(node.key.value)))
      ) {
        reason = 'An argument contains a potentially personal or secret field.';
      }
    });
  }
  return reason;
};

export const reviewConsoleUsage: ScriptReviewRule = ({ program, scopes, report }) => {
  fullAncestor(program, (node, _state, ancestors) => {
    if (node.type !== 'CallExpression') {
      return;
    }
    const method = consoleMethod(node, ancestors, scopes);
    if (!method) {
      return;
    }
    const reason = sensitiveReason(node);
    let message =
      'This call writes to the browser console. Review whether the output is intentional for the deployed form.';
    if (reason) {
      message = `${reason} Review whether personal data or credentials could be exposed; this is a heuristic, not proof of disclosure.`;
    } else if (method === 'error') {
      message =
        'console.error writes a message; it does not itself throw an exception. Review whether this output is intentional.';
    }

    report(reason ? 'sensitive-logging' : 'console-usage', node, {
      title: reason
        ? `Potentially sensitive console.${method}`
        : `Console usage: console.${method}`,
      message,
    });
  });
};
