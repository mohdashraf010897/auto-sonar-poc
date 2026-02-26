# Auto-fixer implementation steps

We **strictly follow** the [Markaicode article](https://markaicode.com/sonarqube-ai-auto-fix-code-smells/) (Feb 2026): SonarQube scan → fetch issues → Node + Claude ±5 lines → apply → build/lint → security scan → PR.

---

## Current pipeline (article flow)

**Workflow:** `.github/workflows/sonar-ai-fix.yml` (only Sonar automation; report-only `sonar-issues-pr.yml` removed).  
**Triggers:** `pull_request` on main/develop, `push` on main.

1. **Checkout** — full history (`fetch-depth: 0`).
2. **SonarQube Scan** — `sonarsource/sonarqube-scan-action@v2` (SONAR_TOKEN, SONAR_HOST_URL; args: projectKey, sources, exclusions). Works with SonarCloud when SONAR_HOST_URL=https://sonarcloud.io.
3. **Get SonarQube Issues** — `sleep 10` then `curl` to `/api/issues/search?projectKeys=...&resolved=false&severities=MAJOR,CRITICAL,BLOCKER,MINOR&ps=100` → `sonar-issues.json`; output `found_issues` from `.total`. (MINOR included so cognitive complexity, duplicate literals, console.log, etc. are fetched.)
4. **Setup Node.js 22** — `actions/setup-node@v4` with node-version 22.
5. **Install Dependencies** — `pnpm install --frozen-lockfile` (includes `@anthropic-ai/sdk`).
6. **Generate AI Fixes** — if `found_issues > 0`: `node scripts/ai-fix-sonar.js` (reads `sonar-issues.json`, ±5 lines context, Claude, writes `ai-fixes.json`).
7. **Apply Fixes with Validation** — if `found_issues > 0`: inline Node script replaces `original` → `fixed` in each file; then `pnpm run build` and `pnpm run lint`.
8. **Security Scan on Fixes** — grep for `eval(` and `dangerouslySetInnerHTML`; exit 1 if found.
9. **Create Fix PR** — if `found_issues > 0`: `peter-evans/create-pull-request@v6` (branch `sonar-ai-fixes-$run_number`, title/body per article).

**Secrets:** `SONAR_TOKEN`, `SONAR_HOST_URL` (e.g. `https://sonarcloud.io`), `ANTHROPIC_API_KEY`.  
**Vars (optional):** `SONAR_PROJECT`.

**Script:** `scripts/ai-fix-sonar.js` — Claude as developer/Sonar fixer; ±CONTEXT_LINES (default 12) around issue line; larger context (≥15) for complexity rules (S3776, S138, S1541). Prompt asks for proper refactors (extract helpers, reduce complexity). Writes `ai-fixes.json`. Env: `CONTEXT_LINES`, `ANTHROPIC_MODEL`.

---

## How to verify

1. Push to main or open a PR to main/develop → workflow runs.
2. With Sonar scan + SONAR_TOKEN/SONAR_HOST_URL: scan runs; after 10s, issues are fetched; `found_issues` set.
3. With `found_issues > 0` and `ANTHROPIC_API_KEY`: AI fixes generated, applied, build/lint and security check run, PR created.
4. Check the PR title "🤖 AI Fix: SonarQube Code Quality Issues" and body (fixed count, model, validation).

**Local test (recommended before pushing):**  
1. Ensure `.env` has `ANTHROPIC_API_KEY`. Optionally set `SONAR_TOKEN`, `SONAR_HOST_URL`, `SONAR_PROJECT` to fetch fresh issues.  
2. Run: `pnpm run sonar-fix:local`  
   - Fetches issues (if credentials set) or uses existing `sonar-issues.json`.  
   - Generates fixes with Claude, applies them, runs build and lint.  
3. Review: `git diff` (and `git diff --stat`).  
4. If satisfied: commit and push. If not: `git checkout -- src/` (and any other modified files) to discard.

**One-off (no full pipeline):**  
With `sonar-issues.json` and `ANTHROPIC_API_KEY`: `node scripts/ai-fix-sonar.js` → then apply (inline node snippet in workflow) → `pnpm run build && pnpm run lint`.

---

## Induced issues (for scanner testing)

To force the scanner to report many issues (e.g. 10+), the following violations are intentionally present:

| File | Rules triggered |
|------|------------------|
| **src/validation.ts** | S2228 (console.warn), S1135 (TODO), S1192 (duplicate 'invalid'/'error'/'valid'), S107 (buildMessage 8 params), S1479 (getCategoryCode switch 12 cases), S134 (deepCheck 4-level nesting), S3776/S138 (classifyPriority) |
| **src/utils.ts** | S1192 (duplicate 'Todo'/'error'), S2228 (console.log, console.error), S3776/S138 (classifyTodoStatus), S107 (mergeFields 8 params) |
| **src/App.tsx** | S3776 (getStatus cognitive complexity), S134 (renderNested 4-level nesting) |

After a Sonar scan, the API returns these so the AI fixer can address multiple issues per run. Remove or refactor these when no longer needed.

