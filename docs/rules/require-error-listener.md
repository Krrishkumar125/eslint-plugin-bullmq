# require-error-listener

Require an `'error'` listener on BullMQ `Worker` and `Queue` instances.

💼 `recommended` (error), `strict` (error)

## Why

BullMQ's [going-to-production guide](https://docs.bullmq.io/guide/going-to-production) says to attach an error listener. An `EventEmitter` that
emits `'error'` with no listener throws, which can take down the process or leave a worker silently stopped.

## What it reports

`new Worker(...)` / `new Queue(...)` imported from `bullmq` (ESM, CommonJS, renamed or namespace imports) when:

- it is never followed by `.on('error', …)`, `.once`, `.addListener` or `.prependListener`; and
- the instance never leaves the file's view. It is not passed to a function, returned, exported or stored on `this` (where something else may attach the listener).

## Examples

❌ `const worker = new Worker('emails', processor, { connection });`

✅

```js
const worker = new Worker('emails', processor, { connection });
worker.on('error', (err) => logger.error(err));
```
