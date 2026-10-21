import rule from '../src/rules/require-error-listener.js';
import { ruleTester } from './helpers.js';

const imp = `import { Queue, Worker } from 'bullmq';\n`;

ruleTester.run('require-error-listener', rule, {
  valid: [
    imp +
      `const worker = new Worker('q', fn, { connection }); worker.on('error', (err) => log(err));`,
    imp + `const queue = new Queue('q'); queue.once('error', report);`,
    imp + `new Worker('q', fn).on('error', console.error);`,
    // escapes: someone else may attach the listener
    imp + `const worker = new Worker('q', fn); register(worker);`,
    imp + `export const queue = new Queue('q');`,
    imp + `function make() { return new Queue('q'); }`,
    imp + `class S { constructor() { this.worker = new Worker('q', fn); } }`,
    imp + `const w = new Worker('q', fn); const all = { w };`,
    imp + `const w = new Worker('q', fn); const deps = { worker: w };`,
    imp + `let a; const w = new Worker('q', fn); a = w;`,
    imp + `const w = new Worker('q', fn); const get = () => w;`,
    imp + `const w = new Worker('q', fn); export { w };`,
    imp + `const w = new Worker('q', fn); export default w;`,
    imp + `const w = new Worker('q', fn); start(...[w]);`,
    imp + `const ws = [new Worker('q', fn)];`,
    imp + `w = new Worker('q', fn);`,
    imp + `const w = new Worker('q', fn); w['on']('error', f);`,
    // not from bullmq
    `import { Worker } from 'node:worker_threads'; const w = new Worker('./x.js');`,
    `const w = new Worker('q', fn);`,
    // CommonJS with listener
    `const { Worker } = require('bullmq'); const w = new Worker('q', fn); w.addListener('error', f);`,
  ],
  invalid: [
    {
      code: imp + `new Worker('q', fn).on('failed', f);`,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: imp + `const w = new Worker('q', fn); w.on(eventName, f); log(w.name); if (w) {}`,
      errors: [{ messageId: 'missing' }],
    },
    {
      code: imp + `const worker = new Worker('q', fn, { connection });`,
      errors: [{ messageId: 'missing', data: { kind: 'Worker' } }],
    },
    {
      code: imp + `const queue = new Queue('q'); queue.on('failed', f);`,
      errors: [{ messageId: 'missing', data: { kind: 'Queue' } }],
    },
    {
      code: `import { Worker as BullWorker } from 'bullmq'; new BullWorker('q', fn);`,
      errors: [{ messageId: 'missing', data: { kind: 'Worker' } }],
    },
    {
      code: `const bullmq = require('bullmq'); const w = new bullmq.Worker('q', fn);`,
      errors: [{ messageId: 'missing', data: { kind: 'Worker' } }],
    },
    {
      code: `import * as bull from 'bullmq'; let q; q = new bull.Queue('x');`,
      errors: [{ messageId: 'missing', data: { kind: 'Queue' } }],
    },
  ],
});
