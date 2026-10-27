import type { AnyNode, Pattern, Program } from 'acorn';
import { fullAncestor } from 'acorn-walk';

export const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);
const BLOCK_TYPES = new Set([
  'BlockStatement',
  'StaticBlock',
  'CatchClause',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'SwitchStatement',
]);

const bindingNames = (pattern: Pattern): string[] => {
  switch (pattern.type) {
    case 'Identifier':
      return [pattern.name];
    case 'RestElement':
      return bindingNames(pattern.argument);
    case 'AssignmentPattern':
      return bindingNames(pattern.left);
    case 'ArrayPattern':
      return pattern.elements.flatMap((item) => (item ? bindingNames(item) : []));
    case 'ObjectPattern':
      return pattern.properties.flatMap((item) =>
        bindingNames(item.type === 'RestElement' ? item.argument : item.value),
      );
    default:
      return [];
  }
};

export interface IScopeInfo {
  bindings: Map<AnyNode, Set<string>>;
  definitions: Map<AnyNode, Map<string, AnyNode[]>>;
}

export const collectScopes = (program: Program): IScopeInfo => {
  const bindings = new Map<AnyNode, Set<string>>();
  const definitions: IScopeInfo['definitions'] = new Map();
  const add = (
    scope: AnyNode | undefined,
    pattern: Pattern | null | undefined,
    definition: AnyNode,
  ): void => {
    if (!scope || !pattern) {
      return;
    }
    const names = bindings.get(scope) ?? new Set<string>();
    const declared = definitions.get(scope) ?? new Map<string, AnyNode[]>();
    bindingNames(pattern).forEach((name) => {
      names.add(name);
      const nodes = declared.get(name) ?? [];
      nodes.push(definition);
      declared.set(name, nodes);
    });
    bindings.set(scope, names);
    definitions.set(scope, declared);
  };
  const enclosingScope = (ancestors: AnyNode[], functionOnly = false): AnyNode | undefined =>
    [...ancestors]
      .reverse()
      .find(
        (node) =>
          node.type === 'Program' ||
          FUNCTION_TYPES.has(node.type) ||
          node.type === 'StaticBlock' ||
          (!functionOnly && BLOCK_TYPES.has(node.type)),
      );

  // Collect declarations before inspecting calls, including hoisted bindings and destructured parameters.
  fullAncestor(program, (node, _state, ancestors) => {
    const parents = ancestors.slice(0, -1);
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        node.params.forEach((parameter) => add(node, parameter, parameter));
        if (node.type !== 'ArrowFunctionExpression') {
          add(node.type === 'FunctionDeclaration' ? enclosingScope(parents) : node, node.id, node);
        }
        break;
      case 'VariableDeclarator': {
        const declaration = parents.at(-1);
        add(
          enclosingScope(
            parents,
            declaration?.type === 'VariableDeclaration' && declaration.kind === 'var',
          ),
          node.id,
          node,
        );
        break;
      }
      case 'CatchClause':
        add(node, node.param, node);
        break;
      case 'ClassDeclaration':
        add(enclosingScope(parents), node.id, node);
        break;
      case 'ClassExpression':
        add(node, node.id, node);
        break;
    }
  });
  return { bindings, definitions };
};

export const isBound = (
  name: string,
  ancestors: AnyNode[],
  bindings: Map<AnyNode, Set<string>>,
): boolean => ancestors.some((scope) => bindings.get(scope)?.has(name));

export const findDefinition = (
  name: string,
  ancestors: AnyNode[],
  scopes: IScopeInfo,
): AnyNode | undefined => {
  for (const scope of [...ancestors].reverse()) {
    if (!scopes.bindings.get(scope)?.has(name)) {
      continue;
    }
    const nodes = scopes.definitions.get(scope)?.get(name);
    return nodes?.length === 1 ? nodes[0] : undefined;
  }
  return undefined;
};
