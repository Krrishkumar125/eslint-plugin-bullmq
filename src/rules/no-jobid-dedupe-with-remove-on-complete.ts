import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import { docsUrl, getProp, isJobOptions, type Node } from '../utils.js';

const removesImmediately = (p: ESTree.Property | undefined): boolean =>
  p?.value.type === 'Literal' && (p.value.value === true || p.value.value === 0);

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when jobId deduplication is combined with removeOnComplete: true, which lets duplicates run again',
      recommended: true,
      url: docsUrl('no-jobid-dedupe-with-remove-on-complete'),
    },
    schema: [],
    messages: {
      conflict:
        'removeOnComplete: true deletes the job as soon as it finishes, so a later add() with the same jobId runs again. The jobId only dedupes while the job is still waiting or active. Keep completed jobs for your dedupe window with removeOnComplete: { age: <seconds> }, or use deduplication: { id, ttl }.',
      conflictDefault:
        "This queue's defaultJobOptions has removeOnComplete: true, so this jobId only dedupes while the job is still waiting or active. A redelivery after completion runs again. Use removeOnComplete: { age: <seconds> } or deduplication: { id, ttl }.",
    },
  },
  create(context) {
    const removingQueues = new Set<string>();
    return {
      VariableDeclarator(node) {
        const init = node.init;
        if (
          node.id.type !== 'Identifier' ||
          init?.type !== 'NewExpression' ||
          init.callee.type !== 'Identifier' ||
          init.callee.name !== 'Queue'
        ) {
          return;
        }
        const opts = init.arguments[1];
        const defaults =
          opts?.type === 'ObjectExpression' ? getProp(opts, 'defaultJobOptions')?.value : undefined;
        if (
          defaults?.type === 'ObjectExpression' &&
          removesImmediately(getProp(defaults, 'removeOnComplete'))
        ) {
          removingQueues.add(node.id.name);
        }
      },
      ObjectExpression(node) {
        if (!isJobOptions(node as Node) || !getProp(node, 'jobId')) return;
        const remove = getProp(node, 'removeOnComplete');
        if (removesImmediately(remove)) {
          context.report({ node: remove as ESTree.Property, messageId: 'conflict' });
          return;
        }
        const call = (node as Node).parent;
        if (
          !remove &&
          call?.type === 'CallExpression' &&
          call.callee.type === 'MemberExpression' &&
          call.callee.object.type === 'Identifier' &&
          removingQueues.has(call.callee.object.name)
        ) {
          context.report({ node: call, messageId: 'conflictDefault' });
        }
      },
    };
  },
};

export default rule;
