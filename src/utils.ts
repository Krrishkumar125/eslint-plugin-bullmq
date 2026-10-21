import type { Rule, Scope } from 'eslint';
import type * as ESTree from 'estree';

export type Node = ESTree.Node & { parent?: Node };

const REPO = 'https://github.com/Krrishkumar125/eslint-plugin-bullmq';
export const docsUrl = (name: string): string => `${REPO}/blob/main/docs/rules/${name}.md`;

function moduleName(node: Node | null | undefined): string | undefined {
  if (
    node?.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'require' &&
    node.arguments[0]?.type === 'Literal' &&
    typeof node.arguments[0].value === 'string'
  ) {
    return node.arguments[0].value;
  }
  return undefined;
}

export interface Imports {
  /** local name -> imported name */
  named: Map<string, string>;
  namespaces: Set<string>;
}

/** Collect bindings imported (ESM or CommonJS) from the given module. */
export function collectImports(program: ESTree.Program, source: string): Imports {
  const named = new Map<string, string>();
  const namespaces = new Set<string>();
  const visitDeclarator = (d: ESTree.VariableDeclarator): void => {
    if (moduleName(d.init as Node) !== source) return;
    if (d.id.type === 'Identifier') namespaces.add(d.id.name);
    if (d.id.type === 'ObjectPattern') {
      for (const p of d.id.properties) {
        if (p.type === 'Property' && p.key.type === 'Identifier' && p.value.type === 'Identifier') {
          named.set(p.value.name, p.key.name);
        }
      }
    }
  };
  for (const stmt of program.body) {
    if (stmt.type === 'ImportDeclaration' && stmt.source.value === source) {
      for (const s of stmt.specifiers) {
        if (s.type === 'ImportSpecifier') {
          const imported =
            s.imported.type === 'Identifier' ? s.imported.name : String(s.imported.value);
          named.set(s.local.name, imported);
        } else if (s.type === 'ImportDefaultSpecifier') {
          named.set(s.local.name, 'default');
        } else {
          namespaces.add(s.local.name);
        }
      }
    } else if (stmt.type === 'VariableDeclaration') {
      stmt.declarations.forEach(visitDeclarator);
    }
  }
  return { named, namespaces };
}

/** Which exported class a `new X(...)` refers to, given the imports of one module. */
export function resolveClass(node: ESTree.NewExpression, imports: Imports): string | undefined {
  const callee = node.callee;
  if (callee.type === 'Identifier') return imports.named.get(callee.name);
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    imports.namespaces.has(callee.object.name) &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  ) {
    return callee.property.name;
  }
  return undefined;
}

export function findVariable(
  context: Rule.RuleContext,
  node: ESTree.Identifier,
): Scope.Variable | undefined {
  let scope: Scope.Scope | null = context.sourceCode.getScope(node);
  while (scope) {
    const v = scope.set.get(node.name);
    if (v) return v;
    scope = scope.upper;
  }
  return undefined;
}

export function propKey(p: ESTree.Property | ESTree.SpreadElement): string | undefined {
  if (p.type !== 'Property' || p.computed) return undefined;
  if (p.key.type === 'Identifier') return p.key.name;
  if (p.key.type === 'Literal' && typeof p.key.value === 'string') return p.key.value;
  return undefined;
}

export function getProp(obj: ESTree.ObjectExpression, key: string): ESTree.Property | undefined {
  return obj.properties.find((p): p is ESTree.Property => propKey(p) === key);
}

export const hasSpread = (obj: ESTree.ObjectExpression): boolean =>
  obj.properties.some((p) => p.type === 'SpreadElement');

/** Is this object literal a BullMQ job-options object (`queue.add(n, d, opts)` or `{ opts: {...} }`)? */
export function isJobOptions(obj: Node): boolean {
  const parent = obj.parent;
  if (!parent) return false;
  if (parent.type === 'CallExpression' && parent.arguments[2] === obj) {
    const c = parent.callee;
    return (
      c.type === 'MemberExpression' &&
      !c.computed &&
      c.property.type === 'Identifier' &&
      c.property.name === 'add'
    );
  }
  return parent.type === 'Property' && parent.value === obj && propKey(parent) === 'opts';
}
