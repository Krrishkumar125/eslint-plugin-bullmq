import type { ESLint, Linter, Rule } from 'eslint';
import noDedupeRemove from './rules/no-jobid-dedupe-with-remove-on-complete.js';
import requireErrorListener from './rules/require-error-listener.js';
import validJobId from './rules/valid-job-id.js';
import workerConnectionMaxRetries from './rules/worker-connection-max-retries.js';

const rules: Record<string, Rule.RuleModule> = {
  'require-error-listener': requireErrorListener,
  'worker-connection-max-retries': workerConnectionMaxRetries,
  'valid-job-id': validJobId,
  'no-jobid-dedupe-with-remove-on-complete': noDedupeRemove,
};

const recommendedRules: Linter.RulesRecord = {
  'bullmq/require-error-listener': 'error',
  'bullmq/worker-connection-max-retries': 'error',
  'bullmq/valid-job-id': 'error',
  'bullmq/no-jobid-dedupe-with-remove-on-complete': 'warn',
};
const strictRules: Linter.RulesRecord = Object.fromEntries(
  Object.keys(recommendedRules).map((k) => [k, 'error']),
);

const plugin = {
  meta: { name: 'eslint-plugin-bullmq', version: '0.1.0' },
  rules,
  configs: {} as {
    recommended: Linter.Config & { rules: Linter.RulesRecord };
    strict: Linter.Config & { rules: Linter.RulesRecord };
    'legacy-recommended': { plugins: string[]; rules: Linter.RulesRecord };
    'legacy-strict': { plugins: string[]; rules: Linter.RulesRecord };
  },
} satisfies ESLint.Plugin;

plugin.configs.recommended = {
  name: 'bullmq/recommended',
  plugins: { bullmq: plugin as ESLint.Plugin },
  rules: recommendedRules,
};
plugin.configs.strict = {
  name: 'bullmq/strict',
  plugins: { bullmq: plugin as ESLint.Plugin },
  rules: strictRules,
};
plugin.configs['legacy-recommended'] = { plugins: ['bullmq'], rules: recommendedRules };
plugin.configs['legacy-strict'] = { plugins: ['bullmq'], rules: strictRules };

export default plugin;
