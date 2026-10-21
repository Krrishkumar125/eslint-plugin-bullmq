# worker-connection-max-retries

Require `maxRetriesPerRequest: null` on ioredis connections used by BullMQ Workers and QueueEvents.

💼 `recommended` (error), `strict` (error) · 💡 has suggestions

## Why

Workers use blocking Redis commands. ioredis's default `maxRetriesPerRequest: 20` makes those
commands fail during a reconnect, so BullMQ requires `null` for worker connections. When you pass
your own `new IORedis()` instance without it, BullMQ throws `maxRetriesPerRequest must be null` at
startup ([guide](https://docs.bullmq.io/guide/going-to-production)). This rule catches it in the editor. The repo's integration test checks that BullMQ still throws.

## What it reports

For `new Worker(name, fn, { connection })` and `new QueueEvents(name, { connection })`:

- `connection` is a `new IORedis(...)` / `new Redis(...)` (inline or a variable in the same file) whose options don't set `maxRetriesPerRequest: null`;
- `connection` is a plain object with an explicit non-null `maxRetriesPerRequest`.

Plain option objects without the key are fine: BullMQ sets `null` itself. Queues are not checked
because a finite value (fail fast) is what you want for a `Queue` used inside HTTP handlers.

## Examples

❌ `const connection = new IORedis(process.env.REDIS_URL);`

✅ `const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });`
