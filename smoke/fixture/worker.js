import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('emails', { connection });
queue.on('error', console.error);

const worker = new Worker('emails', async () => {}, { connection });

await queue.add('welcome', { userId: 7 }, { jobId: 'user:7', removeOnComplete: true });
