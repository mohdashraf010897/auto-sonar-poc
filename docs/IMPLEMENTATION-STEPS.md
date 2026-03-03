# Auto-fixer implementation steps

We **strictly follow** the [Markaicode article](https://markaicode.com/sonarqube-ai-auto-fix-code-smells/) (Feb 2026): SonarQube scan → fetch issues → Node + Claude ±5 lines → apply → build/lint → security scan → PR.

---

## Contributor PR → Sonar issues → Agent fix PR (end-to-end)

When a **contributor opens a PR**, the GitHub + Sonar integration (this workflow) runs a Sonar scan and reports issues on the PR. The **agent (AI fixer)** automatically:

1. **Picks up** the Sonar issues (fetched from Sonar API after the scan).
2. **Generates fixes** with Claude and applies them (build + lint validated).
3. **Raises a fix PR** that **targets the contributor’s branch** (not main).

So the contributor sees: their PR has Sonar issues → a **“🤖 AI Fix: SonarQube Code Quality Issues”** PR appears that merges **into their branch**. They merge the fix PR first; their original PR then includes the fixes and is ready for review/merge. No manual “fix Sonar” step.

- **On `pull_request`:** Checkout is the **PR head** (contributor’s branch). The created fix PR therefore targets that branch.
- **On `push` to main:** Checkout is main; the fix PR targets the default branch.

See **Current pipeline** below for the exact steps.

---

## Current pipeline (article flow)

**Workflow:** `.github/workflows/sonar-ai-fix.yml` (only Sonar automation; report-only `sonar-issues-pr.yml` removed).  
**Triggers:** `pull_request` on main/develop, `push` on main.

1. **Checkout** — full history (`fetch-depth: 0`). On `pull_request`, checkout is the **PR head** so the fix PR targets the contributor’s branch.
2. **SonarQube Scan** — `sonarsource/sonarqube-scan-action@v2` (SONAR_TOKEN, SONAR_HOST_URL; args: projectKey, sources, exclusions). Works with SonarCloud when SONAR_HOST_URL=https://sonarcloud.io.
3. **Get SonarQube Issues** — `sleep 10` then `curl` to `/api/issues/search?projectKeys=...&resolved=false&severities=MAJOR,CRITICAL,BLOCKER,MINOR&ps=100` → `sonar-issues.json`; output `found_issues` from `.total`. (MINOR included so cognitive complexity, duplicate literals, console.log, etc. are fetched.)
4. **Setup Node.js 22** — `actions/setup-node@v4` with node-version 22.
5. **Install Dependencies** — `pnpm install --frozen-lockfile` (includes `@anthropic-ai/sdk`).
6. **Generate AI Fixes** — if `found_issues > 0`: `node scripts/ai-fix-sonar.js` (reads `sonar-issues.json`, ±5 lines context, Claude, writes `ai-fixes.json`).
7. **Apply Fixes with Validation** — if `found_issues > 0`: inline Node script replaces `original` → `fixed` in each file; then `pnpm run build` and `pnpm run lint`.
8. **Security Scan on Fixes** — grep for `eval(` and `dangerouslySetInnerHTML`; exit 1 if found.
9. **Create Fix PR** — if `found_issues > 0`: `peter-evans/create-pull-request@v6` (branch `sonar-ai-fixes-$run_number`). When run was triggered by a PR, the fix PR targets the contributor’s branch; when triggered by push to main, it targets main.

**Secrets:** `SONAR_TOKEN`, `SONAR_HOST_URL` (e.g. `https://sonarcloud.io`), `ANTHROPIC_API_KEY`.  
**Vars (optional):** `SONAR_PROJECT`.

**Script:** `scripts/ai-fix-sonar.js` — Claude as developer/Sonar fixer; ±CONTEXT_LINES (default 12) around issue line; larger context (≥15) for complexity rules (S3776, S138, S1541). Prompt asks for proper refactors (extract helpers, reduce complexity). Writes `ai-fixes.json`. Env: `CONTEXT_LINES`, `ANTHROPIC_MODEL`.

---

## Checkpoint: Phase 1 complete → Phase 2

**Phase 1 (above)** is complete and validated: Claude + GitHub Action fix PR is working; fix PR targets contributor’s branch on PR trigger.

Before starting **Phase 2** (GitHub Copilot agent POC), the checkpoint is documented in **[CHECKPOINT-PHASE1-TO-PHASE2.md](./CHECKPOINT-PHASE1-TO-PHASE2.md)** — criteria met, decision to proceed, and what Phase 2 entails. Work on the Copilot POC (run end-to-end, then decide in-repo vs Copilot vs both) happens after this checkpoint.

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

