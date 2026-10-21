import rule from '../src/rules/worker-connection-max-retries.js';
import { ruleTester } from './helpers.js';

const imp = `import { Worker, Queue, QueueEvents } from 'bullmq';\nimport IORedis from 'ioredis';\n`;

ruleTester.run('worker-connection-max-retries', rule, {
  valid: [
    imp +
      `const connection = new IORedis({ maxRetriesPerRequest: null }); new Worker('q', fn, { connection });`,
    imp +
      `const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null }); new Worker('q', fn, { connection });`,
    // plain options: BullMQ sets maxRetriesPerRequest: null itself
    imp + `new Worker('q', fn, { connection: { host: 'localhost', port: 6379 } });`,
    imp + `new Worker('q', fn, { connection: { host, maxRetriesPerRequest: null } });`,
    // a Queue should fail fast, so a finite value is fine there
    imp + `const connection = new IORedis(); new Queue('q', { connection });`,
    imp + `new Worker('q', fn, { connection: new IORedis(buildOptions()) });`,
    imp + `new Worker('q', fn, { connection: { 'maxRetriesPerRequest': null } });`,
    imp + `new Worker('q', fn, { connection: { maxRetriesPerRequest: retries } });`,
    imp + `new Worker('q', fn, { connection: { [key]: 1 } });`,
    imp + `new Worker('q', fn, opts);`,
    imp + `new Worker('q', fn, { concurrency: 5 });`,
    imp + `const connection = createClient(); new Worker('q', fn, { connection });`,
    `import * as bull from 'bullmq'; import { Redis } from 'ioredis'; new bull.Worker('q', fn, { connection: new Redis({ maxRetriesPerRequest: null }) });`,
    // unknown connection source
    imp + `new Worker('q', fn, { connection: getConnection() });`,
    imp + `const connection = new IORedis({ ...base }); new Worker('q', fn, { connection });`,
    `new Worker('./thread.js', { connection: new Redis() });`,
  ],
  invalid: [
    {
      code: imp + `new Worker('q', fn, { connection: new IORedis({}) });`,
      errors: [
        {
          messageId: 'instance',
          suggestions: [
            {
              messageId: 'addNull',
              output:
                imp +
                `new Worker('q', fn, { connection: new IORedis({ maxRetriesPerRequest: null }) });`,
            },
          ],
        },
      ],
    },
    {
      code: "const { Worker } = require('bullmq'); const { Cluster } = require('ioredis');\nconst c = new Cluster(nodes, { scaleReads: 'slave' });\nnew Worker('q', fn, { connection: c }); new Worker('r', fn, { connection: c });",
      errors: [{ messageId: 'instance', suggestions: 1 }],
    },
    {
      code: imp + `new Worker('q', fn, { connection: { maxRetriesPerRequest: -1 } });`,
      errors: [{ messageId: 'explicit', suggestions: 1 }],
    },
    {
      code: imp + `const connection = new IORedis();\nnew Worker('q', fn, { connection });`,
      errors: [
        {
          messageId: 'instance',
          line: 3,
          suggestions: [
            {
              messageId: 'addNull',
              output:
                imp +
                `const connection = new IORedis({ maxRetriesPerRequest: null });\nnew Worker('q', fn, { connection });`,
            },
          ],
        },
      ],
    },
    {
      code:
        imp +
        `const redis = new IORedis(url, { lazyConnect: true });\nnew QueueEvents('q', { connection: redis });`,
      errors: [
        {
          messageId: 'instance',
          suggestions: [
            {
              messageId: 'addNull',
              output:
                imp +
                `const redis = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: null });\nnew QueueEvents('q', { connection: redis });`,
            },
          ],
        },
      ],
    },
    {
      code: imp + `new Worker('q', fn, { connection: new IORedis(url) });`,
      errors: [
        {
          messageId: 'instance',
          suggestions: [
            {
              messageId: 'addNull',
              output:
                imp +
                `new Worker('q', fn, { connection: new IORedis(url, { maxRetriesPerRequest: null }) });`,
            },
          ],
        },
      ],
    },
    {
      code: imp + `new Worker('q', fn, { connection: { host, maxRetriesPerRequest: 3 } });`,
      errors: [
        {
          messageId: 'explicit',
          suggestions: [
            {
              messageId: 'setNull',
              output:
                imp + `new Worker('q', fn, { connection: { host, maxRetriesPerRequest: null } });`,
            },
          ],
        },
      ],
    },
  ],
});
