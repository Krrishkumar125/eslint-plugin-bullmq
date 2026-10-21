import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import {
  collectImports,
  docsUrl,
  findVariable,
  resolveClass,
  type Imports,
  type Node,
} from '../utils.js';

const CHECKED = new Set(['Worker', 'Queue']);
const LISTEN = new Set(['on', 'once', 'addListener', 'prependListener']);

function isErrorListener(member: Node | undefined, object: Node): boolean {
  if (member?.type !== 'MemberExpression' || member.object !== object) return false;
  const prop = member.property;
  const method =
    !member.computed && prop.type === 'Identifier'
      ? prop.name
      : prop.type === 'Literal'
        ? prop.value
        : undefined;
  if (typeof method !== 'string' || !LISTEN.has(method)) return false;
  const call = member.parent;
  const arg = call?.type === 'CallExpression' ? call.arguments[0] : undefined;
  return arg?.type === 'Literal' && arg.value === 'error';
}

/** The identifier is handed to code we cannot see, which may attach the listener. */
function escapes(id: Node): boolean {
  const p = id.parent;
  if (!p) return false;
  switch (p.type) {
    case 'CallExpression':
    case 'NewExpression':
      return p.arguments.includes(id as ESTree.Expression);
    case 'ReturnStatement':
    case 'ArrayExpression':
    case 'ExportSpecifier':
    case 'ExportDefaultDeclaration':
    case 'SpreadElement':
      return true;
    case 'Property':
      return p.value === id;
    case 'AssignmentExpression':
      return p.right === id;
    case 'ArrowFunctionExpression':
      return p.body === id;
    default:
      return false;
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: "Require an 'error' listener on BullMQ Worker and Queue instances",
      recommended: true,
      url: docsUrl('require-error-listener'),
    },
    schema: [],
    messages: {
      missing:
        "This {{kind}} has no 'error' listener. Without one, a Redis or processor error can crash the process or silently stop the {{kind}}. Add {{kind}}.on('error', handler).",
    },
  },
  create(context) {
    let imports: Imports;
    return {
      Program(program) {
        imports = collectImports(program, 'bullmq');
      },
      NewExpression(node) {
        const kind = resolveClass(node, imports);
        if (!kind || !CHECKED.has(kind)) return;
        const n = node as Node;
        const parent = n.parent;
        let id: ESTree.Identifier | undefined;
        if (parent?.type === 'MemberExpression') {
          if (!isErrorListener(parent, n))
            context.report({ node, messageId: 'missing', data: { kind } });
          return;
        }
        if (parent?.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
          if (parent.parent?.parent?.type === 'ExportNamedDeclaration') return;
          id = parent.id;
        } else if (parent?.type === 'AssignmentExpression' && parent.left.type === 'Identifier') {
          id = parent.left;
        } else if (parent?.type !== 'ExpressionStatement') {
          return; // returned, passed along, stored on `this`, etc.
        }
        if (id) {
          const variable = findVariable(context, id);
          const ok = variable?.references.some((ref) => {
            const ident = ref.identifier as Node;
            return isErrorListener(ident.parent, ident) || escapes(ident);
          });
          if (ok || !variable) return;
        }
        context.report({ node, messageId: 'missing', data: { kind } });
      },
    };
  },
};

export default rule;
