# no-jobid-dedupe-with-remove-on-complete

Warn when `jobId` deduplication is combined with `removeOnComplete: true`.

💼 `recommended` (warn), `strict` (error)

## Why

A custom `jobId` makes BullMQ ignore a second `add()` **only while a job with that id still exists**.
With `removeOnComplete: true` (or `0`) the job is deleted the moment it finishes. A webhook
redelivered a minute later is processed again. The repo's integration test runs this against real Redis
and the job runs twice.

## What it reports

- A job-options object with both `jobId` and `removeOnComplete: true | 0`.
- `queue.add(..., { jobId })` when `queue` was created in the same file with
  `defaultJobOptions: { removeOnComplete: true | 0 }` and the call does not override it.

## Fix

Keep completed jobs for as long as duplicates can arrive:

```js
queue.add('receipt', data, { jobId: event.id, removeOnComplete: { age: 3 * 24 * 3600 } });
// or BullMQ's dedicated API
queue.add('receipt', data, { deduplication: { id: event.id, ttl: 3 * 24 * 3600 * 1000 } });
```
