# no-floating-queue-add

Require BullMQ `queue.add()` and `addBulk()` calls to be awaited or handled.

💼 `recommended` (error), `strict` (error) · 🔧 fixable with `--fix` (adds `await` where it is allowed)

## Why

`queue.add()` talks to Redis and returns a promise. When nobody awaits it:

- if Redis is down or slow, the job is never added and the rejection is unhandled (Node 15+ exits on an unhandled rejection by default);
- a request handler that responds right away, or a script or serverless function that exits right after, can finish before the job is written;
- errors never reach your logs or your HTTP response, so the caller is told "done" for work that was never queued.

`@typescript-eslint/no-floating-promises` catches this too, but only with type information. This rule needs none: it knows which
variables hold a BullMQ `Queue` or `FlowProducer` from the `new` expression.

## What it reports

A statement that calls `.add()` or `.addBulk()` on a `Queue` or `FlowProducer` created in the same file (a variable, a class field
or `this.x = new Queue(...)`) and does nothing with the promise. It also reports `items.forEach((i) => queue.add(...))`, where the
loop cannot wait.

Not reported: `await`, `return`, `.then()`/`.catch()`, `void queue.add(...)` (an explicit fire-and-forget), and assignment to a
variable.

## Fix

`--fix` inserts `await` when the call is inside an `async` function or at the top level of an ES module. Elsewhere it reports
without a fix, because adding `await` there would be a syntax error. The `forEach` case is not fixed; rewrite it as `for...of`
with `await`, or `await Promise.all(items.map(...))`.

## Options

```js
'bullmq/no-floating-queue-add': ['error', { queues: ['emailQueue'] }]
```

`queues`: extra names that hold a queue, for a queue created in another file and imported.

## Examples

❌ `queue.add('welcome', { userId })` · `items.forEach((i) => queue.add('sync', i))`

✅ `await queue.add('welcome', { userId })` · `await Promise.all(items.map((i) => queue.add('sync', i)))` · `void queue.add('ping', {})`
