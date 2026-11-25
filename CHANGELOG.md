# Changelog

## 0.2.0 (2026-11-26)

- New rule `no-floating-queue-add` (recommended: error): `queue.add()` or `addBulk()` on a BullMQ `Queue` or `FlowProducer`
  whose promise nobody awaits, including inside `forEach`. Needs no type information. `--fix` adds `await` inside async
  functions and at the top level of ES modules.
- `--fix` support. `worker-connection-max-retries` sets `maxRetriesPerRequest: null` on a client created inline in the Worker
  options (a client in a variable stays a suggestion, since other code may share it). `valid-job-id` replaces `:` with `-`.
- `no-jobid-dedupe-with-remove-on-complete` suggests `removeOnComplete: { age: 86400 }`.
- `meta.version` now matches the package version (0.1.2 and 0.1.3 reported 0.1.1).
- README: comparison with `@boring-stack-pkg/eslint-plugin-bullmq`.

## 0.1.3 (2026-10-25)

- README: npm weekly downloads badge (docs only, no code changes).

## 0.1.2 (2026-10-23)

- npm metadata: shorter description, focused keywords, homepage/bugs links; README links sibling packages.

## 0.1.1 (2026-10-22)

- README: TypeScript setup and the supported ESLint versions.
- Release smoke test now covers ESLint 8.57 (flat and legacy), 9, 10 and `@typescript-eslint/parser`. CI adds Windows.

## 0.1.0 (2026-10-22)

- Rules: `require-error-listener`, `worker-connection-max-retries`, `valid-job-id`, `no-jobid-dedupe-with-remove-on-complete`.
- Configs: `recommended`, `strict`, `legacy-recommended`, `legacy-strict`.
- Tested on 8 open-source apps. False positive fixed before release: `require-error-listener` ignores
  short-lived instances that are `.close()`d (admin queries, health checks, tests).
