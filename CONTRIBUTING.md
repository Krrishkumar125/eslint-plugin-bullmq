# Contributing

```sh
npm ci
npm test          # RuleTester suites + integration tests (needs Redis on REDIS_URL, default 127.0.0.1:6379)
npm run lint && npm run typecheck
npm run smoke     # packs the plugin and lints smoke/fixture with the tarball
```

False-positive reports are the most valuable issues. Please include a minimal snippet.
New detections need `valid` cases (code that must stay quiet) as well as `invalid` ones.
