import type { AnyNode } from 'acorn';
import { fullAncestor } from 'acorn-walk';
import { memberPath } from '../ast-utils';
import { FUNCTION_TYPES } from '../scope';
import type { ScriptReviewRule } from './types';

const guards = (test: AnyNode, path: string, truthy = true): boolean => {
  if (test.type === 'UnaryExpression' && test.operator === '!') {
    return guards(test.argument, path, !truthy);
  }
  if (truthy && memberPath(test) === path) {
    return true;
  }
  if (test.type === 'LogicalExpression' && test.operator === (truthy ? '&&' : '||')) {
    return guards(test.left, path, truthy) || guards(test.right, path, truthy);
  }
  if (
    test.type === 'BinaryExpression' &&
    ((test.operator === '!=' && truthy) || (test.operator === '==' && !truthy))
  ) {
    return (
      (test.right.type === 'Literal' &&
        test.right.value === null &&
        memberPath(test.left) === path) ||
      (test.left.type === 'Literal' && test.left.value === null && memberPath(test.right) === path)
    );
  }
  return false;
};

const terminates = (node: AnyNode): boolean => {
  if (node.type === 'ReturnStatement' || node.type === 'ThrowStatement') {
    return true;
  }
  const last = node.type === 'BlockStatement' ? node.body.at(-1) : undefined;
  return Boolean(last && terminates(last));
};

const isGuarded = (path: string, node: AnyNode, ancestors: AnyNode[]): boolean => {
  for (const ancestor of [...ancestors].reverse()) {
    if (FUNCTION_TYPES.has(ancestor.type)) {
      break;
    }
    if (ancestor.type === 'IfStatement' || ancestor.type === 'ConditionalExpression') {
      if (
        node.start >= ancestor.consequent.start &&
        node.end <= ancestor.consequent.end &&
        guards(ancestor.test, path)
      ) {
        return true;
      }
      if (
        ancestor.alternate &&
        node.start >= ancestor.alternate.start &&
        node.end <= ancestor.alternate.end &&
        guards(ancestor.test, path, false)
      ) {
        return true;
      }
    }
    if (ancestor.type === 'LogicalExpression' && node.start >= ancestor.right.start) {
      if (ancestor.operator === '&&' && guards(ancestor.left, path)) {
        return true;
      }
      if (ancestor.operator === '||' && guards(ancestor.left, path, false)) {
        return true;
      }
    }
    if (ancestor.type === 'Program' || ancestor.type === 'BlockStatement') {
      // For example: if (!data?.npo) return; followed by data?.npo.type.
      const hasEarlierExitGuard = ancestor.body.some(
        (statement) =>
          statement.type === 'IfStatement' &&
          statement.end <= node.start &&
          !statement.alternate &&
          guards(statement.test, path, false) &&
          terminates(statement.consequent),
      );
      if (hasEarlierExitGuard) {
        return true;
      }
    }
  }
  return false;
};

export const reviewRuntimeAccess: ScriptReviewRule = ({ program, report }) => {
  fullAncestor(program, (node, _state, ancestors) => {
    const inspect = (receiver: AnyNode): void => {
      const path = memberPath(receiver);
      if (path && isGuarded(path, node, ancestors)) {
        return;
      }
      report('unsafe-access', node, {
        title: 'Optional chain leaves an intermediate value unguarded',
        message: `Optional chaining protects an earlier value, but ${path ?? 'an intermediate result'} is accessed without a null check at the next step. Validate it or extend optional chaining if it can be missing. Model guarantees or more complex guards may make this intentional.`,
      });
    };
    if (
      node.type === 'MemberExpression' &&
      !node.optional &&
      node.object.type === 'ChainExpression'
    ) {
      inspect(node.object);
    }
    if (node.type !== 'ChainExpression') {
      return;
    }
    const members: AnyNode[] = [];
    let current: AnyNode = node.expression;
    while (current.type === 'MemberExpression') {
      members.unshift(current);
      current = current.object;
    }
    let sawOptional = false;
    for (const member of members) {
      if (member.type !== 'MemberExpression') {
        continue;
      }
      if (sawOptional && !member.optional) {
        inspect(member.object);
        return;
      }
      sawOptional ||= member.optional;
    }
  });
};
