// Proves, against a real Redis and the real bullmq package, the behaviour each rule warns about.
// If BullMQ ever changes this behaviour, this suite fails and the rule docs need updating.
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { afterAll, describe, expect, it } from 'vitest';

const url = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
const connection = { url };
const name = `eslint-plugin-bullmq-${process.pid}-${Date.now()}`;
const queue = new Queue(name, { connection });
queue.on('error', () => {});

afterAll(async () => {
  await queue.obliterate({ force: true });
  await queue.close();
});

describe('BullMQ behaviour behind the rules', () => {
  it('valid-job-id: rejects ids containing ":"', async () => {
    await expect(queue.add('x', {}, { jobId: 'order:1' })).rejects.toThrow(/cannot contain :/);
  });

  it('valid-job-id: rejects integer ids', async () => {
    await expect(queue.add('x', {}, { jobId: '123' })).rejects.toThrow(/cannot be integers/);
  });

  it('no-jobid-dedupe-with-remove-on-complete: a completed+removed id runs again', async () => {
    let runs = 0;
    const worker = new Worker(name, async () => void runs++, { connection });
    worker.on('error', () => {});
    const waitDone = () => new Promise((r) => worker.once('completed', r));
    let done = waitDone();
    await queue.add('x', {}, { jobId: 'evt_1', removeOnComplete: true });
    await done;
    done = waitDone();
    await queue.add('x', {}, { jobId: 'evt_1', removeOnComplete: true });
    await done;
    expect(runs).toBe(2);

    // Keeping completed jobs makes the same id a no-op.
    done = waitDone();
    await queue.add('x', {}, { jobId: 'evt_2' });
    await done;
    await queue.add('x', {}, { jobId: 'evt_2' });
    await new Promise((r) => setTimeout(r, 300));
    expect(runs).toBe(3);
    await worker.close();
  });

  it('worker-connection-max-retries: BullMQ refuses a worker ioredis instance without it', async () => {
    const redis = new IORedis(url, { lazyConnect: true });
    let error: unknown;
    try {
      const w = new Worker(name, async () => {}, { connection: redis, autorun: false });
      await w.close();
    } catch (err) {
      error = err;
    }
    redis.disconnect();
    expect(String(error)).toMatch(/maxRetriesPerRequest must be null/);
  });
});
