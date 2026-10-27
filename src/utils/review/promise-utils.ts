import type { AnyNode, CallExpression, NewExpression } from 'acorn';
import { propertyName, resolveFunction } from './ast-utils';
import { isBound } from './scope';
import type { IScopeInfo } from './scope';

export type PromiseProducer = CallExpression | NewExpression;

export const isRequest = (node: AnyNode, ancestors: AnyNode[], scopes: IScopeInfo): boolean => {
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (node.callee.type === 'Identifier') {
    return node.callee.name === 'fetch' && !isBound('fetch', ancestors, scopes.bindings);
  }
  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'http' &&
    !isBound('http', ancestors, scopes.bindings) &&
    ['get', 'post', 'put', 'patch', 'delete', 'request', 'head', 'options'].includes(
      propertyName(node.callee) ?? '',
    )
  );
};

export const isPromiseProducer = (
  node: AnyNode,
  ancestors: AnyNode[],
  scopes: IScopeInfo,
): node is PromiseProducer => {
  if (isRequest(node, ancestors, scopes)) {
    return true;
  }
  if (node.type === 'NewExpression') {
    return (
      node.callee.type === 'Identifier' &&
      node.callee.name === 'Promise' &&
      !isBound('Promise', ancestors, scopes.bindings)
    );
  }
  if (node.type !== 'CallExpression') {
    return false;
  }
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'Promise' &&
    !isBound('Promise', ancestors, scopes.bindings) &&
    ['all', 'allSettled', 'race', 'any', 'resolve', 'reject'].includes(
      propertyName(node.callee) ?? '',
    )
  ) {
    return true;
  }
  const requestFunction = resolveFunction(node.callee, ancestors, scopes);
  if (
    !requestFunction ||
    (requestFunction.type !== 'FunctionDeclaration' &&
      requestFunction.type !== 'FunctionExpression' &&
      requestFunction.type !== 'ArrowFunctionExpression')
  ) {
    return false;
  }
  if (requestFunction.async) {
    return true;
  }

  // Recognise simple wrappers that directly return a request or its promise chain.
  const body = requestFunction.body;
  const lastStatement = body.type === 'BlockStatement' ? body.body.at(-1) : body;
  let returnedExpression: AnyNode | undefined;
  if (lastStatement?.type === 'ReturnStatement') {
    returnedExpression = lastStatement.argument ?? undefined;
  } else if (body.type !== 'BlockStatement') {
    returnedExpression = body;
  }

  while (returnedExpression?.type === 'CallExpression') {
    if (isRequest(returnedExpression, [...ancestors, requestFunction], scopes)) {
      return true;
    }
    returnedExpression =
      returnedExpression.callee.type === 'MemberExpression'
        ? returnedExpression.callee.object
        : undefined;
  }
  return false;
};

export const chainRoot = (
  node: AnyNode,
  ancestors: AnyNode[],
): { root: AnyNode; parents: AnyNode[] } => {
  let root = node;
  let index = ancestors.length - 2;
  for (; index >= 0; index -= 1) {
    const parent = ancestors[index];
    if (
      (parent?.type === 'MemberExpression' && parent.object === root) ||
      (parent?.type === 'CallExpression' && parent.callee === root) ||
      (parent?.type === 'ChainExpression' && parent.expression === root)
    ) {
      root = parent;
    } else {
      break;
    }
  }
  return { root, parents: ancestors.slice(0, index + 1) };
};

const isHandler = (node: AnyNode | undefined): boolean =>
  Boolean(
    node && node.type !== 'Literal' && !(node.type === 'Identifier' && node.name === 'undefined'),
  );

export const hasRejectionHandler = (
  root: AnyNode,
  ancestors: AnyNode[],
  scopes: IScopeInfo,
): boolean => {
  let current = root;
  while (current.type === 'ChainExpression' || current.type === 'CallExpression') {
    if (current.type === 'ChainExpression') {
      current = current.expression;
      continue;
    }
    if (current.callee.type !== 'MemberExpression') {
      break;
    }
    const method = propertyName(current.callee);
    let handler: AnyNode | undefined;
    if (method === 'catch') {
      handler = current.arguments[0];
    } else if (method === 'then') {
      handler = current.arguments[1];
    }

    if (isHandler(handler)) {
      const handlerFunction = resolveFunction(handler, ancestors, scopes);
      let body: AnyNode | undefined;
      if (
        handlerFunction?.type === 'FunctionDeclaration' ||
        handlerFunction?.type === 'FunctionExpression' ||
        handlerFunction?.type === 'ArrowFunctionExpression'
      ) {
        body = handlerFunction.body;
      }

      // Rethrowing or returning Promise.reject leaves the resulting chain rejected.
      const lastStatement = body?.type === 'BlockStatement' ? body.body.at(-1) : body;
      const returnedExpression =
        lastStatement?.type === 'ReturnStatement' ? lastStatement.argument : lastStatement;
      const returnsRejectedPromise =
        returnedExpression?.type === 'CallExpression' &&
        returnedExpression.callee.type === 'MemberExpression' &&
        returnedExpression.callee.object.type === 'Identifier' &&
        returnedExpression.callee.object.name === 'Promise' &&
        propertyName(returnedExpression.callee) === 'reject' &&
        !isBound(
          'Promise',
          [...ancestors, ...(handlerFunction ? [handlerFunction] : [])],
          scopes.bindings,
        );

      if (lastStatement?.type !== 'ThrowStatement' && !returnsRejectedPromise) {
        return true;
      }
    }
    current = current.callee.object;
  }
  return false;
};
