import rule from '../src/rules/no-jobid-dedupe-with-remove-on-complete.js';
import { ruleTester } from './helpers.js';

ruleTester.run('no-jobid-dedupe-with-remove-on-complete', rule, {
  valid: [
    `queue.add('x', d, { jobId: event.id });`,
    `queue.add('x', d, { jobId: event.id, removeOnComplete: { age: 86400 } });`,
    `queue.add('x', d, { removeOnComplete: true });`,
    `queue.add('x', d, { jobId: event.id, removeOnComplete: false });`,
    `const q = new Queue('x', { defaultJobOptions: { removeOnComplete: { age: 3600 } } }); q.add('y', d, { jobId: id });`,
  ],
  invalid: [
    {
      code: `queue.add('x', d, { jobId: event.id, removeOnComplete: true });`,
      errors: [{ messageId: 'conflict' }],
    },
    {
      code: `queue.add('x', d, { jobId: id, removeOnComplete: 0 });`,
      errors: [{ messageId: 'conflict' }],
    },
    {
      code: `import { Queue } from 'bullmq';
             const emails = new Queue('emails', { defaultJobOptions: { removeOnComplete: true } });
             await emails.add('send', d, { jobId: event.id });`,
      errors: [{ messageId: 'conflictDefault', line: 3 }],
    },
  ],
});
