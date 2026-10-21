import type { Rule } from 'eslint';
import { docsUrl, isJobOptions, propKey, type Node } from '../utils.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    hasSuggestions: true,
    docs: {
      description: "Disallow BullMQ custom job ids that contain ':' or are integers",
      recommended: true,
      url: docsUrl('valid-job-id'),
    },
    schema: [],
    messages: {
      colon:
        "BullMQ uses ':' as its Redis key separator, so a custom jobId containing ':' is rejected. Use another separator such as '-'.",
      integer:
        'BullMQ rejects integer custom job ids (they collide with its auto-generated ids). Prefix it, e.g. `order-42`.',
      replaceColon: "Replace ':' with '-'",
    },
  },
  create(context) {
    return {
      Property(node) {
        if (propKey(node) !== 'jobId' || !isJobOptions((node as Node).parent as Node)) return;
        const v = node.value as Node;
        if (v.type === 'Literal') {
          if (typeof v.value === 'number' && Number.isInteger(v.value)) {
            context.report({ node: v, messageId: 'integer' });
          } else if (typeof v.value === 'string') {
            if (/^\d+$/.test(v.value)) context.report({ node: v, messageId: 'integer' });
            else if (v.value.includes(':')) {
              const raw = context.sourceCode.getText(v);
              context.report({
                node: v,
                messageId: 'colon',
                suggest: [
                  {
                    messageId: 'replaceColon',
                    fix: (f) => f.replaceText(v, raw.replace(/:/g, '-')),
                  },
                ],
              });
            }
          }
        } else if (
          v.type === 'TemplateLiteral' &&
          v.quasis.some((q) => q.value.raw.includes(':'))
        ) {
          context.report({
            node: v,
            messageId: 'colon',
            suggest: [
              {
                messageId: 'replaceColon',
                fix: (f) =>
                  v.quasis
                    .filter((q) => q.value.raw.includes(':'))
                    .map((q) => f.replaceText(q, context.sourceCode.getText(q).replace(/:/g, '-'))),
              },
            ],
          });
        }
      },
    };
  },
};

export default rule;
