# Changelog

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
