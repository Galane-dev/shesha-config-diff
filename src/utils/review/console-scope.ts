import type { AnyNode, Pattern, Program } from 'acorn';
import { fullAncestor } from 'acorn-walk';

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const BLOCK_TYPES = new Set(['BlockStatement', 'StaticBlock', 'CatchClause', 'ForStatement', 'ForInStatement', 'ForOfStatement', 'SwitchStatement']);

const bindingNames = (pattern: Pattern): string[] => {
  switch (pattern.type) {
    case 'Identifier': return [pattern.name];
    case 'RestElement': return bindingNames(pattern.argument);
    case 'AssignmentPattern': return bindingNames(pattern.left);
    case 'ArrayPattern': return pattern.elements.flatMap((item) => item ? bindingNames(item) : []);
    case 'ObjectPattern': return pattern.properties.flatMap((item) =>
      bindingNames(item.type === 'RestElement' ? item.argument : item.value));
    default: return [];
  }
};

export const collectBindings = (program: Program): Map<AnyNode, Set<string>> => {
  const bindings = new Map<AnyNode, Set<string>>();
  const add = (scope: AnyNode | undefined, pattern: Pattern | null | undefined): void => {
    if (!scope || !pattern) return;
    const names = bindings.get(scope) ?? new Set<string>();
    bindingNames(pattern).forEach((name) => names.add(name));
    bindings.set(scope, names);
  };
  const enclosingScope = (ancestors: AnyNode[], functionOnly = false): AnyNode | undefined =>
    [...ancestors].reverse().find((node) => node.type === 'Program' || FUNCTION_TYPES.has(node.type) ||
      node.type === 'StaticBlock' || (!functionOnly && BLOCK_TYPES.has(node.type)));

  // Collect declarations before inspecting calls, including hoisted bindings and destructured parameters.
  fullAncestor(program, (node, _state, ancestors) => {
    const parents = ancestors.slice(0, -1);
    switch (node.type) {
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        node.params.forEach((parameter) => add(node, parameter));
        if (node.type !== 'ArrowFunctionExpression') {
          add(node.type === 'FunctionDeclaration' ? enclosingScope(parents) : node, node.id);
        }
        break;
      case 'VariableDeclarator': {
        const declaration = parents.at(-1);
        add(enclosingScope(parents, declaration?.type === 'VariableDeclaration' && declaration.kind === 'var'), node.id);
        break;
      }
      case 'CatchClause': add(node, node.param); break;
      case 'ClassDeclaration': add(enclosingScope(parents), node.id); break;
      case 'ClassExpression': add(node, node.id); break;
    }
  });
  return bindings;
};

export const isBound = (name: string, ancestors: AnyNode[], bindings: Map<AnyNode, Set<string>>): boolean =>
  ancestors.some((scope) => bindings.get(scope)?.has(name));
