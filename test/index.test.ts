import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../src/index.js';

describe('plugin', () => {
  it('exposes rules, docs urls and configs', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual([
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
      `import { Worker } from 'bullmq';
       import IORedis from 'ioredis';
       const connection = new IORedis();
       const worker = new Worker('emails', async () => {}, { connection });
       await queue.add('send', {}, { jobId: 'user:1', removeOnComplete: true });`,
    );
    expect(result?.messages.map((m) => m.ruleId).sort()).toEqual([
      'bullmq/no-jobid-dedupe-with-remove-on-complete',
      'bullmq/require-error-listener',
      'bullmq/valid-job-id',
      'bullmq/worker-connection-max-retries',
    ]);
  });
});
