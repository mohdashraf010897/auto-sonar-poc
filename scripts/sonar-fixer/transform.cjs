/**
 * Codemods for Sonar rules: remove node at given line for a given rule.
 * Rules: S1481 (unused variable), S2228/S106 (console.*).
 */
const jscodeshift = require('jscodeshift').withParser('tsx');

/**
 * @param {string} source
 * @param {{ fixes: Array<{ rule: string, line: number }> }} options
 * @returns {string}
 */
function applyFixes(source, options) {
  const fixes = options?.fixes || [];
  if (fixes.length === 0) return source;

  const linesByRule = new Map();
  for (const { rule, line } of fixes) {
    if (!linesByRule.has(rule)) linesByRule.set(rule, new Set());
    linesByRule.get(rule).add(line);
  }

  const root = jscodeshift(source);
  let changed = false;

  // Remove VariableDeclaration (S1481 - unused var) at given lines
  const s1481Lines = linesByRule.get('javascript:S1481') || linesByRule.get('typescript:S1481') || new Set();
  root.find(jscodeshift.VariableDeclaration).forEach((path) => {
    const line = path.node.loc?.start?.line;
    if (line != null && s1481Lines.has(line)) {
      path.prune();
      changed = true;
    }
  });

  // Remove ExpressionStatement that is console.* (S2228/S106) at given lines
  const consoleLines = new Set([
    ...(linesByRule.get('javascript:S2228') || []),
    ...(linesByRule.get('typescript:S2228') || []),
    ...(linesByRule.get('javascript:S106') || []),
    ...(linesByRule.get('typescript:S106') || []),
  ]);
  root.find(jscodeshift.ExpressionStatement).forEach((path) => {
    const node = path.node;
    const line = node.loc?.start?.line;
    if (line == null || !consoleLines.has(line)) return;
    const expr = node.expression;
    if (expr.type === 'CallExpression' && expr.callee.type === 'MemberExpression') {
      const obj = expr.callee.object;
      const prop = expr.callee.property?.name;
      if (obj.type === 'Identifier' && obj.name === 'console' && typeof prop === 'string') {
        path.prune();
        changed = true;
      }
    }
  });

  if (!changed) return source;
  return root.toSource({ quote: 'single', trailingComma: true });
}

module.exports = { applyFixes, jscodeshift };
