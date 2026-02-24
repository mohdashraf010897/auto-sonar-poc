#!/usr/bin/env node
/**
 * Sonar fixer runner: read issues JSON, apply rule-specific codemods, write changes.
 * Usage: node run.cjs [path/to/issues.json]
 * Default: SONAR_ISSUES_JSON env or ./issues.json
 */
const fs = require('fs');
const path = require('path');
const { applyFixes } = require('./transform.cjs');

const ISSUES_PATH = process.argv[2] || process.env.SONAR_ISSUES_JSON || path.join(__dirname, 'issues.json');

// Rules we can fix with codemods (add more as we implement them)
const FIXABLE_RULES = new Set([
  'javascript:S1481', 'typescript:S1481',
  'javascript:S2228', 'typescript:S2228',
  'javascript:S106', 'typescript:S106',
]);

function componentToFilePath(component) {
  if (!component || typeof component !== 'string') return null;
  const idx = component.indexOf(':');
  return idx === -1 ? component : component.slice(idx + 1);
}

function main() {
  let raw;
  try {
    raw = fs.readFileSync(ISSUES_PATH, 'utf8');
  } catch (err) {
    console.error('Failed to read issues:', ISSUES_PATH, err.message);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON in', ISSUES_PATH, err.message);
    process.exit(1);
  }

  const issues = data.issues || [];
  const byFile = new Map();

  for (const issue of issues) {
    const rule = issue.rule;
    if (!rule || !FIXABLE_RULES.has(rule)) continue;
    const filePath = componentToFilePath(issue.component);
    if (!filePath || (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx'))) continue;
    const line = issue.line;
    if (line == null) continue;

    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath).push({ rule, line });
  }

  if (byFile.size === 0) {
    console.log('No fixable issues (supported: S1481, S2228, S106)');
    return;
  }

  const cwd = process.cwd();
  let totalFixed = 0;

  for (const [filePath, fileIssues] of byFile) {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
    if (!fs.existsSync(absPath)) {
      console.warn('Skip (missing):', filePath);
      continue;
    }

    const source = fs.readFileSync(absPath, 'utf8');
    const fixes = fileIssues.map(({ rule, line }) => ({ rule, line }));
    const out = applyFixes(source, { fixes });
    if (out !== source) {
      fs.writeFileSync(absPath, out, 'utf8');
      totalFixed += fixes.length;
      console.log('Fixed', filePath, fixes.length, 'issue(s)');
    }
  }

  console.log('Total fixes applied:', totalFixed);
}

main();
