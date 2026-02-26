#!/usr/bin/env node
/**
 * Run the full Sonar AI fix pipeline locally: (optional) fetch issues → generate fixes → apply → build + lint.
 * Loads .env from repo root. Review changes with `git diff` before committing.
 *
 * Usage: pnpm run sonar-fix:local
 * Requires: ANTHROPIC_API_KEY in .env. Optional: SONAR_TOKEN, SONAR_HOST_URL, SONAR_PROJECT to fetch fresh issues.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function fetchIssues() {
  const { SONAR_TOKEN, SONAR_HOST_URL, SONAR_PROJECT } = process.env;
  const project = SONAR_PROJECT || 'mohdashraf010897_auto-sonar-poc';
  if (!SONAR_TOKEN || !SONAR_HOST_URL) {
    console.log('No SONAR_TOKEN or SONAR_HOST_URL — using existing sonar-issues.json if present.');
    return;
  }
  const url = `${SONAR_HOST_URL.replace(/\/$/, '')}/api/issues/search?projectKeys=${project}&resolved=false&severities=MAJOR,CRITICAL,BLOCKER,MINOR&ps=100`;
  const auth = Buffer.from(`${SONAR_TOKEN}:`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) {
    console.warn('Fetch failed:', res.status);
    return;
  }
  const data = await res.json();
  const out = resolve(root, 'sonar-issues.json');
  writeFileSync(out, JSON.stringify({ total: data.total ?? 0, issues: data.issues ?? [] }, null, 2));
  console.log('Fetched', (data.issues ?? []).length, 'issues → sonar-issues.json');
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...opts });
  if (r.status !== 0 && !opts.allowFail) process.exit(r.status ?? 1);
  return r;
}

async function main() {
  loadEnv();
  process.chdir(root);

  await fetchIssues();

  const issuesPath = resolve(root, 'sonar-issues.json');
  if (!existsSync(issuesPath)) {
    console.error('No sonar-issues.json. Set SONAR_TOKEN and SONAR_HOST_URL to fetch, or run a Sonar scan and copy issues.json here.');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(issuesPath, 'utf-8'));
  const count = data.issues?.length ?? 0;
  if (count === 0) {
    console.log('No issues in sonar-issues.json. Nothing to fix.');
    process.exit(0);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set. Add it to .env.');
    process.exit(1);
  }

  console.log('Generating AI fixes...');
  run('node', ['scripts/ai-fix-sonar.js']);

  const fixesPath = resolve(root, 'ai-fixes.json');
  if (!existsSync(fixesPath)) {
    console.error('ai-fixes.json was not created.');
    process.exit(1);
  }
  const fixes = JSON.parse(readFileSync(fixesPath, 'utf-8'));
  if (fixes.length === 0) {
    console.log('No fixes generated. Check ai-fixes.json or API key.');
    process.exit(0);
  }

  // Apply bottom-to-top by (file, line) so earlier replacements don't invalidate later ones
  fixes.sort((a, b) => (a.file !== b.file ? a.file.localeCompare(b.file) : b.line - a.line));
  console.log('Applying', fixes.length, 'fix(es)...');
  for (const fix of fixes) {
    let content = readFileSync(resolve(root, fix.file), 'utf-8');
    if (!content.includes(fix.original)) {
      console.error('Original context not found in', fix.file);
      process.exit(1);
    }
    content = content.replace(fix.original, fix.fixed);
    writeFileSync(resolve(root, fix.file), content);
  }

  console.log('Running build and lint...');
  run('pnpm', ['run', 'build']);
  run('pnpm', ['run', 'lint']);

  console.log('\nDone. Review changes with: git diff');
  console.log('If satisfied: git add -A && git commit -m "fix: apply Sonar AI fixes (local)"');
  console.log('To discard: git checkout -- src/ (and other modified files)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
