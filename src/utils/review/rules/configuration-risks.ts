import type { AnyNode } from 'acorn';
import { fullAncestor } from 'acorn-walk';
import { propertyName } from '../ast-utils';
import { inspectConfigurationValue } from '../configuration-values';
import type { ScriptReviewRule } from './types';

const assignedName = (parent: AnyNode | undefined): string => {
  if (parent?.type === 'VariableDeclarator' || parent?.type === 'AssignmentPattern') {
    const target = parent.type === 'VariableDeclarator' ? parent.id : parent.left;
    return target.type === 'Identifier' ? target.name : '';
  }
  if (parent?.type === 'AssignmentExpression') {
    if (parent.left.type === 'Identifier') {
      return parent.left.name;
    }

    return parent.left.type === 'MemberExpression' ? (propertyName(parent.left) ?? '') : '';
  }
  if (parent?.type === 'Property' && !parent.computed) {
    if (parent.key.type === 'Identifier') {
      return parent.key.name;
    }

    return parent.key.type === 'Literal' ? String(parent.key.value) : '';
  }
  return '';
};

export const reviewConfigurationRisks: ScriptReviewRule = ({ program, report }) => {
  fullAncestor(program, (node, _state, ancestors) => {
    let value: string | null | undefined;
    if (node.type === 'Literal' && typeof node.value === 'string') {
      value = node.value;
    } else if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
      value = node.quasis[0]?.value.cooked;
    }
    if (value === undefined || value === null) {
      return;
    }
    const parent = ancestors.at(-2);
    // A literal property key is a name, not its configured value.
    if (parent?.type === 'Property' && parent.key === node && !parent.computed) {
      return;
    }
    for (const risk of inspectConfigurationValue(value, assignedName(parent))) {
      report(risk.rule, node, {
        title: risk.title,
        message: risk.message,
        redactions: risk.redact ? [{ start: node.start + 1, end: node.end - 1 }] : undefined,
      });
    }
  });
};
