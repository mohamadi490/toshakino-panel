// Fails when relative imports between src/app/**/*.ts files form a cycle.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve('src/app');
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) files.push(p);
  }
})(root);

const importRe = /(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)/g;
const resolveImport = (from, spec) => {
  const base = resolve(dirname(from), spec);
  return [base + '.ts', join(base, 'index.ts')].find((c) => existsSync(c));
};

const graph = new Map();
for (const f of files) {
  const deps = new Set();
  for (const m of readFileSync(f, 'utf8').matchAll(importRe)) {
    const target = resolveImport(f, m[1] ?? m[2]);
    // Lazy `import()` edges are allowed to point "back"; only static imports form real cycles.
    if (target && m[1]) deps.add(target);
  }
  graph.set(f, [...deps]);
}

const state = new Map();
const stack = [];
let cycle = null;
function visit(n) {
  if (cycle) return;
  state.set(n, 1);
  stack.push(n);
  for (const d of graph.get(n) ?? []) {
    if (state.get(d) === 1) { cycle = [...stack.slice(stack.indexOf(d)), d]; return; }
    if (!state.has(d)) visit(d);
  }
  stack.pop();
  state.set(n, 2);
}
for (const f of files) if (!state.has(f)) visit(f);

if (cycle) {
  console.error('Circular dependency detected:\n  ' + cycle.map((p) => p.replace(root + '/', '')).join('\n  -> '));
  process.exit(1);
}
console.log(`No circular dependencies in ${files.length} files.`);
