import type { AnyNode, MemberExpression } from 'acorn';
import type { IScopeInfo } from './scope';
import { findDefinition } from './scope';

export const propertyName = (node: MemberExpression): string | undefined => {
  if (!node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }

  if (
    node.computed &&
    node.property.type === 'Literal' &&
    typeof node.property.value === 'string'
  ) {
    return node.property.value;
  }

  return undefined;
};

export const fingerprint = (node: AnyNode): string =>
  JSON.stringify(node, (key, value: unknown) => {
    if (['start', 'end', 'loc', 'raw'].includes(key)) {
      return undefined;
    }

    return typeof value === 'bigint' ? `${value}n` : value;
  });

export const resolveFunction = (
  node: AnyNode | undefined,
  ancestors: AnyNode[],
  scopes: IScopeInfo,
): AnyNode | undefined => {
  const definition =
    node?.type === 'Identifier' ? findDefinition(node.name, ancestors, scopes) : node;
  const value =
    definition?.type === 'VariableDeclarator' && definition.id.type === 'Identifier'
      ? definition.init
      : definition;
  return value &&
    ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(value.type)
    ? value
    : undefined;
};

export const memberPath = (node: AnyNode): string | undefined => {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'ChainExpression') {
    return memberPath(node.expression);
  }
  if (node.type !== 'MemberExpression') {
    return undefined;
  }
  const parent = memberPath(node.object);
  const property =
    propertyName(node) ??
    (node.computed && node.property.type === 'Literal' ? String(node.property.value) : undefined);
  return parent && property ? `${parent}.${property}` : undefined;
};
