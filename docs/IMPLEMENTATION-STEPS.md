# Auto-fixer implementation steps

We **strictly follow** the [Markaicode article](https://markaicode.com/sonarqube-ai-auto-fix-code-smells/) (Feb 2026): SonarQube scan → fetch issues → Node + Claude ±5 lines → apply → build/lint → security scan → PR.

---

## Current pipeline (article flow)

**Workflow:** `.github/workflows/sonar-ai-fix.yml` (only Sonar automation; report-only `sonar-issues-pr.yml` removed).  
**Triggers:** `pull_request` on main/develop, `push` on main.

1. **Checkout** — full history (`fetch-depth: 0`).
2. **SonarQube Scan** — `sonarsource/sonarqube-scan-action@v2` (SONAR_TOKEN, SONAR_HOST_URL; args: projectKey, sources, exclusions). Works with SonarCloud when SONAR_HOST_URL=https://sonarcloud.io.
3. **Get SonarQube Issues** — `sleep 10` then `curl` to `/api/issues/search?projectKeys=...&resolved=false&severities=MAJOR,CRITICAL,BLOCKER&ps=100` → `sonar-issues.json`; output `found_issues` from `.total`.
4. **Setup Node.js 22** — `actions/setup-node@v4` with node-version 22.
5. **Install Dependencies** — `pnpm install --frozen-lockfile` (includes `@anthropic-ai/sdk`).
6. **Generate AI Fixes** — if `found_issues > 0`: `node scripts/ai-fix-sonar.js` (reads `sonar-issues.json`, ±5 lines context, Claude, writes `ai-fixes.json`).
7. **Apply Fixes with Validation** — if `found_issues > 0`: inline Node script replaces `original` → `fixed` in each file; then `pnpm run build` and `pnpm run lint`.
8. **Security Scan on Fixes** — grep for `eval(` and `dangerouslySetInnerHTML`; exit 1 if found.
9. **Create Fix PR** — if `found_issues > 0`: `peter-evans/create-pull-request@v6` (branch `sonar-ai-fixes-$run_number`, title/body per article).

**Secrets:** `SONAR_TOKEN`, `SONAR_HOST_URL` (e.g. `https://sonarcloud.io`), `ANTHROPIC_API_KEY`.  
**Vars (optional):** `SONAR_PROJECT`.

**Script:** `scripts/ai-fix-sonar.js` — matches article: `issues.issues`, `issue.component.split(':')[1]`, `contextStart = issue.line - 5`, `contextEnd = issue.line + 5`, prompt and Claude call, write `ai-fixes.json`.

---

## How to verify

1. Push to main or open a PR to main/develop → workflow runs.
2. With Sonar scan + SONAR_TOKEN/SONAR_HOST_URL: scan runs; after 10s, issues are fetched; `found_issues` set.
3. With `found_issues > 0` and `ANTHROPIC_API_KEY`: AI fixes generated, applied, build/lint and security check run, PR created.
4. Check the PR title "🤖 AI Fix: SonarQube Code Quality Issues" and body (fixed count, model, validation).

**Local test (no API key):**  
- `sonar-issues.json` and a manual `ai-fixes.json` are in repo (or create mock).  
- Apply: `node -e "const fs=require('fs');const fixes=JSON.parse(fs.readFileSync('ai-fixes.json','utf-8'));for(const f of fixes){let c=fs.readFileSync(f.file,'utf-8');fs.writeFileSync(f.file,c.replace(f.original,f.fixed));}"`  
- Then `pnpm run build && pnpm run lint`.

**Local test (with Claude):**  
Set `ANTHROPIC_API_KEY`, ensure `sonar-issues.json` exists (from API or use the mock), run `node scripts/ai-fix-sonar.js` → then apply (as above) and build/lint.

