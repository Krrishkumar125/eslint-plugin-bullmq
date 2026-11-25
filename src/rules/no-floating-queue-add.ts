import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import { collectImports, docsUrl, resolveClass, type Imports, type Node } from '../utils.js';

const PRODUCERS = new Set(['Queue', 'FlowProducer']);
const METHODS = new Set(['add', 'addBulk']);

type Fn = ESTree.FunctionDeclaration | ESTree.FunctionExpression | ESTree.ArrowFunctionExpression;

function enclosingFunction(node: Node): Fn | undefined {
  for (let n = node.parent; n; n = n.parent) {
    if (
      n.type === 'FunctionDeclaration' ||
      n.type === 'FunctionExpression' ||
      n.type === 'ArrowFunctionExpression'
    ) {
      return n;
    }
  }
  return undefined;
}

/** `queue` -> "queue", `this.queue` -> "this.queue", anything else -> undefined. */
function receiverName(obj: ESTree.Node): string | undefined {
  if (obj.type === 'Identifier') return obj.name;
  if (
    obj.type === 'MemberExpression' &&
    obj.object.type === 'ThisExpression' &&
    !obj.computed &&
    obj.property.type === 'Identifier'
  ) {
    return `this.${obj.property.name}`;
  }
  return undefined;
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'Require BullMQ queue.add() and addBulk() calls to be awaited or handled',
      recommended: true,
      url: docsUrl('no-floating-queue-add'),
    },
    schema: [
      {
        type: 'object',
        properties: {
          queues: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Extra names that hold a Queue or FlowProducer, e.g. one imported from another file.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      floating:
        '{{call}}() returns a promise that is not awaited or handled. If Redis is down or slow the job is never added and the rejection goes unhandled, and a process that exits right after loses the job. Await it, return it, or add .catch().',
      inCallback:
        '{{call}}() inside forEach() is not awaited, so failures are lost and the loop does not wait. Use for...of with await, or await Promise.all(items.map(...)).',
    },
  },
  create(context) {
    let bull: Imports;
    const opts = (context.options[0] ?? {}) as { queues?: string[] };
    const producers = new Set(opts.queues ?? []);
    const candidates: Array<{ call: ESTree.CallExpression; name: string; inCallback: boolean }> =
      [];
    const isProducer = (n: ESTree.Node | null | undefined): boolean =>
      n?.type === 'NewExpression' && PRODUCERS.has(resolveClass(n, bull) ?? '');

    function candidate(call: ESTree.CallExpression, inCallback: boolean): void {
      const c = call.callee;
      if (c.type !== 'MemberExpression' || c.computed || c.property.type !== 'Identifier') return;
      if (!METHODS.has(c.property.name)) return;
      const name = receiverName(c.object);
      if (name) candidates.push({ call, name, inCallback });
    }

    return {
      Program(program) {
        bull = collectImports(program, 'bullmq');
      },
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && isProducer(node.init)) producers.add(node.id.name);
      },
      AssignmentExpression(node) {
        const name = receiverName(node.left);
        if (name && isProducer(node.right)) producers.add(name);
      },
      PropertyDefinition(node: ESTree.PropertyDefinition) {
        const key = node.key.type === 'Identifier' && !node.computed ? node.key.name : undefined;
        if (key && isProducer(node.value)) producers.add(`this.${key}`);
      },
      ExpressionStatement(node) {
        if (node.expression.type === 'CallExpression') candidate(node.expression, false);
      },
      'CallExpression > ArrowFunctionExpression > CallExpression.body'(
        node: ESTree.CallExpression,
      ) {
        const arrow = (node as Node).parent as ESTree.ArrowFunctionExpression & { parent: Node };
        const loop = arrow.parent;
        if (
          loop.type === 'CallExpression' &&
          loop.callee.type === 'MemberExpression' &&
          !loop.callee.computed &&
          loop.callee.property.type === 'Identifier' &&
          loop.callee.property.name === 'forEach'
        ) {
          candidate(node, true);
        }
      },
      'Program:exit'() {
        const src = context.sourceCode;
        const moduleCode =
          (context.languageOptions?.sourceType ?? context.parserOptions?.sourceType) === 'module';
        for (const { call, name, inCallback } of candidates) {
          if (!producers.has(name)) continue;
          const callee = call.callee as ESTree.MemberExpression;
          const method = (callee.property as ESTree.Identifier).name;
          const data = { call: `${src.getText(callee.object)}.${method}` };
          if (inCallback) {
            context.report({ node: call, messageId: 'inCallback', data });
            continue;
          }
          const fn = enclosingFunction(call as Node);
          const canAwait = fn ? fn.async : moduleCode;
          context.report({
            node: call,
            messageId: 'floating',
            data,
            fix: canAwait ? (f) => f.insertTextBefore(call, 'await ') : null,
          });
        }
      },
    } as Rule.RuleListener;
  },
};

export default rule;
