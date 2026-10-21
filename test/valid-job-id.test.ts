import rule from '../src/rules/valid-job-id.js';
import { ruleTester } from './helpers.js';

ruleTester.run('valid-job-id', rule, {
  valid: [
    `queue.add('x', data, { jobId: 'order-42' });`,
    `queue.add('x', data, { jobId: event.id });`,
    "queue.add('x', data, { jobId: `order-${id}` });",
    `queue.addBulk([{ name: 'a', data, opts: { jobId: 'user_7' } }]);`,
    // jobId outside job options is not ours to judge
    `const row = { jobId: 'a:b' };`,
  ],
  invalid: [
    {
      code: `queue.add('x', data, { jobId: 'order:42' });`,
      errors: [
        {
          messageId: 'colon',
          suggestions: [
            { messageId: 'replaceColon', output: `queue.add('x', data, { jobId: 'order-42' });` },
          ],
        },
      ],
    },
    {
      code: "queue.add('x', data, { jobId: `user:${id}:sync` });",
      errors: [
        {
          messageId: 'colon',
          suggestions: [
            {
              messageId: 'replaceColon',
              output: "queue.add('x', data, { jobId: `user-${id}-sync` });",
            },
          ],
        },
      ],
    },
    { code: `queue.add('x', data, { jobId: '12345' });`, errors: [{ messageId: 'integer' }] },
    { code: `queue.add('x', data, { jobId: 42 });`, errors: [{ messageId: 'integer' }] },
    {
      code: `flow.add({ name: 'p', queueName: 'q', opts: { jobId: 'a:b' }, children: [] });`,
      errors: [{ messageId: 'colon', suggestions: 1 }],
    },
  ],
});
