# eslint-plugin-bullmq

[![CI](https://github.com/Krrishkumar125/eslint-plugin-bullmq/actions/workflows/ci.yml/badge.svg)](https://github.com/Krrishkumar125/eslint-plugin-bullmq/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/eslint-plugin-bullmq)](https://www.npmjs.com/package/eslint-plugin-bullmq)
[![downloads](https://img.shields.io/npm/dm/eslint-plugin-bullmq)](https://www.npmjs.com/package/eslint-plugin-bullmq)

ESLint rules for the BullMQ mistakes in the official [going-to-production guide](https://docs.bullmq.io/guide/going-to-production). Each one is
usually found in production first.

| Rule                                                                                             | What it catches                                                | recommended | strict | 💡  |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ----------- | ------ | --- |
| [require-error-listener](docs/rules/require-error-listener.md)                                   | `Worker`/`Queue` with no `'error'` listener                    | error       | error  |     |
| [worker-connection-max-retries](docs/rules/worker-connection-max-retries.md)                     | worker ioredis connection without `maxRetriesPerRequest: null` | error       | error  | ✅  |
| [valid-job-id](docs/rules/valid-job-id.md)                                                       | custom `jobId` containing `:` or an integer (BullMQ throws)    | error       | error  | ✅  |
| [no-jobid-dedupe-with-remove-on-complete](docs/rules/no-jobid-dedupe-with-remove-on-complete.md) | `jobId` dedupe silently disabled by `removeOnComplete: true`   | warn        | error  |     |

Every behaviour the rules warn about is checked against **real Redis + the real `bullmq` package**
in [`test/bullmq-premises.integration.test.ts`](test/bullmq-premises.integration.test.ts).

## 60-second start

```sh
npm i -D eslint eslint-plugin-bullmq
```

```js
// eslint.config.js
import bullmq from 'eslint-plugin-bullmq';

export default [bullmq.configs.recommended]; // or bullmq.configs.strict
```

```js
// worker.js
const connection = new IORedis(process.env.REDIS_URL);
const worker = new Worker('emails', processor, { connection });
await queue.add('welcome', data, { jobId: `user:${id}`, removeOnComplete: true });
```

```text
$ npx eslint worker.js
  1:20  error    This ioredis connection is used by a BullMQ Worker but does not set maxRetriesPerRequest: null ...  bullmq/worker-connection-max-retries
  2:16  error    This Worker has no 'error' listener ...                                                           bullmq/require-error-listener
  3:44  error    BullMQ uses ':' as its Redis key separator, so a custom jobId containing ':' is rejected ...       bullmq/valid-job-id
  3:63  warning  removeOnComplete: true deletes the job as soon as it finishes ...                                 bullmq/no-jobid-dedupe-with-remove-on-complete
```

Legacy `.eslintrc` (ESLint 8): `{ "extends": ["plugin:bullmq/legacy-recommended"] }`.

Starting a new project? [create-bullmq-app](https://github.com/Krrishkumar125/create-bullmq-app) scaffolds
a worker that already passes these rules. Webhook-driven queues: see also
[eslint-plugin-webhook-safety](https://github.com/Krrishkumar125/eslint-plugin-webhook-safety).

TypeScript: ESLint only lints `.ts` files that some config object matches, so combine it with `typescript-eslint`:
`export default [...tseslint.configs.recommended, bullmq.configs.recommended];`

Requires ESLint 8.57+, 9 or 10 and Node ≥ 20. Every release is smoke-tested from the packed tarball against ESLint
8.57 (flat and legacy `.eslintrc`), 9, 10 and `@typescript-eslint/parser`, and the rules' tests run on Linux and Windows. Not affiliated with Taskforce.sh / BullMQ.

## Sibling packages

Other tools by the same author:

- [secret-blast-radius](https://www.npmjs.com/package/secret-blast-radius): what a malicious npm install could steal, plus a rotation plan
- [zod-india](https://www.npmjs.com/package/zod-india): Zod schemas for GSTIN, PAN, IFSC, UPI and Aadhaar
- [create-bullmq-app](https://www.npmjs.com/package/create-bullmq-app): scaffold a production BullMQ + TypeScript service
- [webhook-crash-lab](https://www.npmjs.com/package/webhook-crash-lab): crash-test webhook handlers against duplicates and races
- [webhook-crash-lab-mcp](https://www.npmjs.com/package/webhook-crash-lab-mcp): MCP server so coding agents can run webhook-crash-lab
- [eslint-plugin-webhook-safety](https://www.npmjs.com/package/eslint-plugin-webhook-safety): lint rules for unsafe Stripe webhook handlers

## License

MIT © Krrish Kumar
