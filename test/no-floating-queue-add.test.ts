import rule from '../src/rules/no-floating-queue-add.js';
import { ruleTester } from './helpers.js';

const imp = `import { Queue, FlowProducer } from 'bullmq';\nconst queue = new Queue('emails');\n`;

ruleTester.run('no-floating-queue-add', rule, {
  valid: [
    imp + `await queue.add('send', data);`,
    imp + `async function f() { return queue.add('send', data); }`,
    imp + `queue.add('send', data).catch(log);`,
    imp + `void queue.add('send', data);`,
    imp + `const job = queue.add('send', data);`,
    imp + `await Promise.all(items.map((i) => queue.add('send', i)));`,
    // not a BullMQ queue
    `const set = new Set(); set.add(1);`,
    `import { Queue } from 'other-lib'; const q = new Queue(); q.add(1);`,
    imp + `items.forEach((i) => set.add(i));`,
  ],
  invalid: [
    {
      code: imp + `queue.add('send', data);`,
      output: imp + `await queue.add('send', data);`,
      errors: [{ messageId: 'floating', data: { call: 'queue.add' } }],
    },
    {
      code: imp + `async function signup(u) {\n  queue.addBulk([{ name: 'a', data: u }]);\n}`,
      output:
        imp + `async function signup(u) {\n  await queue.addBulk([{ name: 'a', data: u }]);\n}`,
      errors: [{ messageId: 'floating', data: { call: 'queue.addBulk' } }],
    },
    {
      // no fix where await is not allowed
      code: imp + `function signup(u) { queue.add('welcome', u); }`,
      output: null,
      errors: [{ messageId: 'floating' }],
    },
    {
      code: imp + `items.forEach((i) => queue.add('send', i));`,
      output: null,
      errors: [{ messageId: 'inCallback' }],
    },
    {
      code: `import { FlowProducer } from 'bullmq';\nconst flow = new FlowProducer();\nconst run = async () => { flow.add(tree); };`,
      output: `import { FlowProducer } from 'bullmq';\nconst flow = new FlowProducer();\nconst run = async () => { await flow.add(tree); };`,
      errors: [{ messageId: 'floating', data: { call: 'flow.add' } }],
    },
    {
      code: `import * as bull from 'bullmq';\nclass Mailer {\n  queue = new bull.Queue('mail');\n  async send(m) { this.queue.add('m', m); }\n}`,
      output: `import * as bull from 'bullmq';\nclass Mailer {\n  queue = new bull.Queue('mail');\n  async send(m) { await this.queue.add('m', m); }\n}`,
      errors: [{ messageId: 'floating', data: { call: 'this.queue.add' } }],
    },
    {
      code: `const { Queue } = require('bullmq');\nclass Mailer {\n  constructor() { this.q = new Queue('mail'); }\n  async send(m) { this.q.add('m', m); }\n}`,
      output: `const { Queue } = require('bullmq');\nclass Mailer {\n  constructor() { this.q = new Queue('mail'); }\n  async send(m) { await this.q.add('m', m); }\n}`,
      errors: [{ messageId: 'floating' }],
    },
    {
      code: `import { emailQueue } from './queues';\nexport async function h() { emailQueue.add('x', {}); }`,
      options: [{ queues: ['emailQueue'] }],
      output: `import { emailQueue } from './queues';\nexport async function h() { await emailQueue.add('x', {}); }`,
      errors: [{ messageId: 'floating' }],
    },
    {
      // the queue can be declared after the code that uses it
      code: `import { Queue } from 'bullmq';\nexport async function h() { queue.add('x', {}); }\nconst queue = new Queue('q');`,
      output: `import { Queue } from 'bullmq';\nexport async function h() { await queue.add('x', {}); }\nconst queue = new Queue('q');`,
      errors: [{ messageId: 'floating' }],
    },
  ],
});
