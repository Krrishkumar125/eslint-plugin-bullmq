# no-jobid-dedupe-with-remove-on-complete

Warn when `jobId` deduplication is combined with `removeOnComplete: true`.

💼 `recommended` (warn), `strict` (error) · 💡 has suggestions (`removeOnComplete: { age: 86400 }`)

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

## Suggestion

Editors offer to replace the value with `{ age: 86400 }`, which keeps completed jobs, and so the dedupe, for a day while still
bounding Redis memory. It is a suggestion and not a `--fix`, because the right window depends on how late your duplicates arrive.
This also answers rules that require `removeOnComplete` to be set: an age satisfies them without turning dedupe off.
