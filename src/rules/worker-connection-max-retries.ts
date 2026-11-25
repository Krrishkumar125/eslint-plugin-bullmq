import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import {
  collectImports,
  docsUrl,
  findVariable,
  getProp,
  hasSpread,
  resolveClass,
  type Imports,
  type Node,
} from '../utils.js';

const BLOCKING = new Map([
  ['Worker', 2],
  ['QueueEvents', 1],
]);
const REDIS_FALLBACK = /^(IO)?Redis$|^Cluster$/;

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description:
        'Require `maxRetriesPerRequest: null` on ioredis connections used by BullMQ Workers and QueueEvents',
      recommended: true,
      url: docsUrl('worker-connection-max-retries'),
    },
    schema: [],
    messages: {
      instance:
        "This ioredis connection is used by a BullMQ {{kind}} but does not set maxRetriesPerRequest: null. BullMQ throws 'maxRetriesPerRequest must be null' when the {{kind}} starts; set it so blocking commands survive Redis reconnects.",
      explicit:
        'BullMQ Workers need maxRetriesPerRequest: null; a finite value makes blocking commands fail during Redis reconnects.',
      addNull: 'Add maxRetriesPerRequest: null',
      setNull: 'Set maxRetriesPerRequest to null',
    },
  },
  create(context) {
    let bull: Imports;
    let ioredis: Imports;
    const reported = new Set<ESTree.Node>();

    const isRedis = (n: ESTree.NewExpression): boolean =>
      resolveClass(n, ioredis) !== undefined ||
      (n.callee.type === 'Identifier' && REDIS_FALLBACK.test(n.callee.name));

    // `shared`: the client is declared elsewhere and may serve other code, so
    // changing its retry policy is offered as a suggestion, not applied by --fix.
    function checkObject(obj: ESTree.ObjectExpression, shared = false): 'ok' | 'missing' {
      const prop = getProp(obj, 'maxRetriesPerRequest');
      if (!prop) return hasSpread(obj) ? 'ok' : 'missing';
      const v = prop.value;
      if (v.type === 'Literal' && v.value === null) return 'ok';
      if (v.type === 'Literal' || (v.type === 'UnaryExpression' && v.argument.type === 'Literal')) {
        if (!reported.has(prop)) {
          reported.add(prop);
          const setNull: Rule.ReportFixer = (f) => f.replaceText(v, 'null');
          context.report({
            node: prop,
            messageId: 'explicit',
            fix: shared ? null : setNull,
            suggest: [{ messageId: 'setNull', fix: setNull }],
          });
        }
      }
      return 'ok';
    }

    function checkInstance(n: ESTree.NewExpression, kind: string, shared: boolean): void {
      if (reported.has(n)) return;
      const args = n.arguments as ESTree.Node[];
      const last = args[args.length - 1];
      if (last?.type === 'ObjectExpression') {
        if (checkObject(last, shared) === 'ok') return;
      } else if (
        args.some(
          (a) =>
            a.type !== 'Literal' &&
            a.type !== 'TemplateLiteral' &&
            a.type !== 'Identifier' &&
            a.type !== 'MemberExpression',
        )
      ) {
        return; // options built dynamically
      }
      reported.add(n);
      const prop = 'maxRetriesPerRequest: null';
      const addNull: Rule.ReportFixer = (fixer) => {
        if (last?.type === 'ObjectExpression') {
          const lastProp = last.properties[last.properties.length - 1];
          return lastProp
            ? fixer.insertTextAfter(lastProp, `, ${prop}`)
            : fixer.replaceText(last, `{ ${prop} }`);
        }
        if (last) return fixer.insertTextAfter(last, `, { ${prop} }`);
        const end = (n.range?.[1] ?? 1) - 1;
        return fixer.insertTextBeforeRange([end, end], `{ ${prop} }`);
      };
      context.report({
        node: n,
        messageId: 'instance',
        data: { kind },
        fix: shared ? null : addNull,
        suggest: [{ messageId: 'addNull', fix: addNull }],
      });
    }

    return {
      Program(program) {
        bull = collectImports(program, 'bullmq');
        ioredis = collectImports(program, 'ioredis');
      },
      NewExpression(node) {
        const kind = resolveClass(node, bull);
        const index = kind ? BLOCKING.get(kind) : undefined;
        if (!kind || index === undefined) return;
        const opts = node.arguments[index] as Node | undefined;
        if (opts?.type !== 'ObjectExpression') return;
        const conn = getProp(opts, 'connection')?.value as Node | undefined;
        if (!conn) return;
        if (conn.type === 'ObjectExpression') {
          checkObject(conn);
        } else if (conn.type === 'NewExpression' && isRedis(conn)) {
          checkInstance(conn, kind, false);
        } else if (conn.type === 'Identifier') {
          const def = findVariable(context, conn)?.defs[0];
          const init =
            def?.node.type === 'VariableDeclarator' ? (def.node.init as Node | null) : null;
          if (init?.type === 'NewExpression' && isRedis(init)) checkInstance(init, kind, true);
        }
      },
    };
  },
};

export default rule;
