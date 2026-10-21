# Changelog

## 0.1.0 (2026-10-22)

- Rules: `require-error-listener`, `worker-connection-max-retries`, `valid-job-id`, `no-jobid-dedupe-with-remove-on-complete`.
- Configs: `recommended`, `strict`, `legacy-recommended`, `legacy-strict`.
- Tested on 8 open-source apps. False positive fixed before release: `require-error-listener` ignores
  short-lived instances that are `.close()`d (admin queries, health checks, tests).
