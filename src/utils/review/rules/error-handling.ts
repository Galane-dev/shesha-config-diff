import type { AnyNode } from 'acorn';
import { fullAncestor } from 'acorn-walk';
import { propertyName, resolveFunction } from '../ast-utils';
import { consoleMethod } from './console-usage';
import type { IRuleContext, ScriptReviewRule } from './types';

const onlyLogs = (node: AnyNode, ancestors: AnyNode[], context: IRuleContext): boolean => {
  if (node.type === 'BlockStatement') {
    const statements = node.body.filter((item) => item.type !== 'EmptyStatement');
    return statements.length > 0 && statements.every((item) => onlyLogs(item, ancestors, context));
  }
  if (node.type === 'ExpressionStatement') {
    return onlyLogs(node.expression, ancestors, context);
  }
  if (node.type === 'ReturnStatement' && node.argument) {
    return onlyLogs(node.argument, ancestors, context);
  }
  return node.type === 'CallExpression' && Boolean(consoleMethod(node, ancestors, context.scopes));
};

export const reviewErrorHandling: ScriptReviewRule = (context) => {
  fullAncestor(context.program, (node, _state, ancestors) => {
    let handler: AnyNode | undefined;
    let handlerAncestors = ancestors;
    if (node.type === 'CatchClause') {
      handler = node.body;
    }
    if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
      const method = propertyName(node.callee);
      let callback: AnyNode | undefined;
      if (method === 'catch') {
        callback = node.arguments[0];
      } else if (method === 'then') {
        callback = node.arguments[1];
      }

      const handlerFunction = resolveFunction(callback, ancestors, context.scopes);
      if (
        handlerFunction?.type === 'FunctionDeclaration' ||
        handlerFunction?.type === 'FunctionExpression' ||
        handlerFunction?.type === 'ArrowFunctionExpression'
      ) {
        handler = handlerFunction.body;
        handlerAncestors = [...ancestors, handlerFunction];
      }
    }
    if (!handler) {
      return;
    }
    const empty =
      handler.type === 'BlockStatement' &&
      handler.body.every((item) => item.type === 'EmptyStatement');
    if (!empty && !onlyLogs(handler, [...handlerAncestors, handler], context)) {
      return;
    }
    context.report('error-handling', handler, {
      title: empty ? 'Empty failure handler' : 'Failure is only logged',
      message: empty
        ? 'This catch/failure handler takes no action. Confirm that silently ignoring the failure is intentional.'
        : 'This failure handler only writes to the console. Consider whether the caller needs a rejection, a recovery value, or user-visible feedback. Logging alone may be intentional.',
    });
  });
};
