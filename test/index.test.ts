import { readFileSync } from 'node:fs';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

describe('plugin', () => {
  it('exposes rules, docs urls and configs', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual([
      'no-floating-queue-add',
      'no-jobid-dedupe-with-remove-on-complete',
      'require-error-listener',
      'valid-job-id',
      'worker-connection-max-retries',
    ]);
    for (const rule of Object.values(plugin.rules))
      expect(rule.meta?.docs?.url).toMatch(/^https:\/\//);
    expect(Object.values(plugin.configs.strict.rules).every((v) => v === 'error')).toBe(true);
    expect(plugin.configs['legacy-recommended'].plugins).toEqual(['bullmq']);
  });

  it('lints end to end with the recommended config', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [plugin.configs.recommended],
    });
    const [result] = await eslint.lintText(
      `import { Queue, Worker } from 'bullmq';
       import IORedis from 'ioredis';
       const connection = new IORedis();
       const worker = new Worker('emails', async () => {}, { connection });
       const queue = new Queue('emails', { connection });
       queue.on('error', console.error);
       queue.add('send', {}, { jobId: 'user:1', removeOnComplete: true });`,
    );
    expect(result?.messages.map((m) => m.ruleId).sort()).toEqual([
      'bullmq/no-floating-queue-add',
      'bullmq/no-jobid-dedupe-with-remove-on-complete',
      'bullmq/require-error-listener',
      'bullmq/valid-job-id',
      'bullmq/worker-connection-max-retries',
    ]);
  });

  it('fixes what is safe to fix with --fix', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: [plugin.configs.recommended],
      fix: true,
    });
    const [result] = await eslint.lintText(
      `import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
const queue = new Queue('emails', { connection: { host: 'redis' } });
queue.on('error', console.error);
const worker = new Worker('emails', async () => {}, { connection: new IORedis(url) });
worker.on('error', console.error);
queue.add('send', {}, { jobId: 'user:1' });
`,
    );
    expect(result?.output).toBe(`import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
const queue = new Queue('emails', { connection: { host: 'redis' } });
queue.on('error', console.error);
const worker = new Worker('emails', async () => {}, { connection: new IORedis(url, { maxRetriesPerRequest: null }) });
worker.on('error', console.error);
await queue.add('send', {}, { jobId: 'user-1' });
`);
    expect(result?.messages).toEqual([]);
  });

  it('reports the version in package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(plugin.meta.version).toBe(pkg.version);
  });
});
