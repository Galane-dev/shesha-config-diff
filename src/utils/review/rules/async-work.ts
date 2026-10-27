import type { AnyNode } from 'acorn';
import { fullAncestor } from 'acorn-walk';
import { chainRoot, hasRejectionHandler, isPromiseProducer, isRequest } from '../promise-utils';
import { findDefinition, FUNCTION_TYPES } from '../scope';
import { consoleMethod } from './console-usage';
import type { ScriptReviewRule } from './types';

interface IReference {
  node: AnyNode;
  ancestors: AnyNode[];
}

interface IPromiseUsage {
  waited: boolean;
  caught: boolean;
  transferred: boolean;
}

const getFunctionScope = (ancestors: AnyNode[]): AnyNode | undefined =>
  [...ancestors].reverse().find((node) => FUNCTION_TYPES.has(node.type) || node.type === 'Program');

export const reviewAsyncWork: ScriptReviewRule = (context) => {
  const references = new Map<AnyNode, IReference[]>();
  const producers: IReference[] = [];

  // Index local references so a stored promise can be followed to its consumers.
  fullAncestor(context.program, (node, _state, ancestors) => {
    if (isPromiseProducer(node, ancestors, context.scopes)) {
      producers.push({ node, ancestors: [...ancestors] });
    }
    if (node.type === 'Identifier') {
      const definition = findDefinition(node.name, ancestors, context.scopes);
      if (definition) {
        const items = references.get(definition) ?? [];
        items.push({ node, ancestors: [...ancestors] });
        references.set(definition, items);
      }
    }
  });

  const getPromiseUsage = (
    node: AnyNode,
    ancestors: AnyNode[],
    followVariable = true,
  ): IPromiseUsage => {
    const { root, parents } = chainRoot(node, ancestors);
    const parent = parents.at(-1);
    const caught = hasRejectionHandler(root, ancestors, context.scopes);
    if (
      parent?.type === 'AwaitExpression' ||
      parent?.type === 'ReturnStatement' ||
      (parent?.type === 'ArrowFunctionExpression' && parent.body === root)
    ) {
      return { waited: true, caught, transferred: true };
    }
    if (parent?.type === 'ArrayExpression') {
      return getPromiseUsage(parent, parents, followVariable);
    }
    if (parent?.type === 'SpreadElement') {
      return getPromiseUsage(parent, parents, followVariable);
    }
    if (parent?.type === 'CallExpression' && parent.callee !== root) {
      if (isPromiseProducer(parent, parents, context.scopes)) {
        return getPromiseUsage(parent, parents, followVariable);
      }
      if (consoleMethod(parent, parents, context.scopes)) {
        return { waited: false, caught, transferred: false };
      }
      // An unknown consumer may own this promise.
      return { waited: false, caught, transferred: true };
    }
    if (parent?.type === 'VariableDeclarator' && parent.init === root && followVariable) {
      const consumers = (references.get(parent) ?? [])
        .filter(
          (item) =>
            getFunctionScope(item.ancestors) === getFunctionScope(ancestors) &&
            item.node !== parent.id,
        )
        .map((item) => getPromiseUsage(item.node, item.ancestors, false));
      return {
        waited: consumers.some((item) => item.waited),
        caught: caught || consumers.some((item) => item.caught),
        transferred: consumers.some((item) => item.transferred),
      };
    }
    return { waited: false, caught, transferred: false };
  };

  const isExecutedByHook = (ancestors: AnyNode[]): boolean =>
    ancestors.every((node, index) => {
      if (!FUNCTION_TYPES.has(node.type)) {
        return true;
      }
      const parent = ancestors[index - 1];
      // Inline wrappers execute now; ordinary callbacks and manual Promise executors require data-flow analysis.
      return parent?.type === 'CallExpression' && parent.callee === node;
    });

  for (const producer of producers) {
    const promiseUsage = getPromiseUsage(producer.node, producer.ancestors);
    if (!promiseUsage.waited && !promiseUsage.caught && !promiseUsage.transferred) {
      context.report('unhandled-promise', producer.node, {
        title: 'Possibly unhandled promise rejection',
        message:
          'This known promise-producing call is detached and no rejection handler was found. Return or await it, or deliberately handle failure. External/global handling cannot be established statically.',
      });
    }
    if (
      !context.script.requiresCompletion ||
      !isRequest(producer.node, producer.ancestors, context.scopes) ||
      !isExecutedByHook(producer.ancestors)
    ) {
      continue;
    }
    let completionUsage = promiseUsage;
    // Waiting for an inline wrapper only helps if it also waits for/returns the inner request.
    for (let index = producer.ancestors.length - 1; index >= 0; index -= 1) {
      const wrapperFunction = producer.ancestors[index];
      const call = producer.ancestors[index - 1];
      if (
        wrapperFunction &&
        FUNCTION_TYPES.has(wrapperFunction.type) &&
        call?.type === 'CallExpression' &&
        call.callee === wrapperFunction &&
        (completionUsage.waited || completionUsage.transferred)
      ) {
        completionUsage = getPromiseUsage(call, producer.ancestors.slice(0, index));
      }
    }
    if (!completionUsage.waited && !completionUsage.transferred) {
      context.report('async-completion', producer.node, {
        title: 'Request may outlive its lifecycle action',
        message:
          'This completion-sensitive hook starts a request without returning or awaiting it. The form may continue or navigate before it finishes, even if a catch handler logs failures. Confirm whether the work is intentionally detached.',
      });
    }
  }
};
