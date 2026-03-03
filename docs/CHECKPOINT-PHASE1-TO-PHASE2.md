# Checkpoint: Phase 1 complete → Phase 2 (Copilot POC)

This doc marks the **checkpoint** between Phase 1 (Claude + GitHub Action) and Phase 2 (GitHub Copilot agent POC). Proceed to Phase 2 only after this checkpoint is agreed.

---

## Phase 1 — Claude API fixation via GitHub Action ✅

**Status:** Complete and validated.

**What was done:**

- **Workflow:** [`.github/workflows/sonar-ai-fix.yml`](../.github/workflows/sonar-ai-fix.yml) — on `pull_request` or `push` to main: Sonar scan → fetch issues → Claude (`scripts/ai-fix-sonar.js`) generates fixes → apply with build/lint → create fix PR.
- **Fix PR targeting:** On PR trigger, the fix PR targets the **contributor’s branch**; on push to main it targets main.
- **Secrets:** `SONAR_TOKEN`, `SONAR_HOST_URL`, `ANTHROPIC_API_KEY`.
- **Validation:** Fix PR has been created and validated (build/lint passed; contributor-branch targeting confirmed).

**References:**

- [IMPLEMENTATION-STEPS.md](./IMPLEMENTATION-STEPS.md) — pipeline steps, verification, local test.
- [CONTRIBUTOR-PR-SONAR-AGENT-FIX.md](./CONTRIBUTOR-PR-SONAR-AGENT-FIX.md) — flow and implementation summary.

---

## Checkpoint (gate before Phase 2)

**Checkpoint criteria:**

| Item | Status |
|------|--------|
| Phase 1 workflow runs on PR/push | ✅ |
| Sonar issues fetched (MAJOR, CRITICAL, BLOCKER, MINOR) | ✅ |
| Claude generates fixes; build/lint pass | ✅ |
| Fix PR created and targets correct branch | ✅ |
| Security scan (no eval/dangerouslySetInnerHTML) | ✅ |
| Local test path (`pnpm run sonar-fix:local`) available | ✅ |

**Decision:** Phase 1 is production-ready for the in-repo path. Proceed to Phase 2 (Copilot POC) when ready.

---

## Phase 2 — POC: GitHub Copilot agent path (after checkpoint)

**Goal:** When Sonar reports issues on a PR, assign the fix task to the **GitHub Copilot coding agent** (Agents on GitHub) so Copilot opens the fix PR instead of (or in addition to) the in-repo Claude script.

**Already in repo (pre-checkpoint):**

- Workflow: [`.github/workflows/sonar-copilot-agent-poc.yml`](../.github/workflows/sonar-copilot-agent-poc.yml)
- Script: `scripts/trigger-copilot-via-issue.js` (GraphQL: create issue, assign to Copilot with `baseRef` = PR head)
- Setup and usage: [POC-COPILOT-AGENT-SONAR.md](./POC-COPILOT-AGENT-SONAR.md)

**Next (post-checkpoint):** Execute the runbook below, then decide path (in-repo only vs Copilot only vs both).

---

## Phase 2 execution runbook

Use this checklist to run the Copilot POC end-to-end.

### Prerequisites

- [ ] **Copilot / Agents on GitHub** — Your GitHub account (or org) has access to [Agents on GitHub](https://github.com/features/copilot/agents); coding agent can be enabled per repo.
- [ ] **Sonar** — `SONAR_TOKEN` and `SONAR_HOST_URL` are already set (same as Phase 1). Optionally `vars.SONAR_PROJECT` if different from default.

### 1. Enable Copilot coding agent for the repo

- [ ] Go to repo **Settings** → **Copilot** (or **Integrations** → **GitHub Copilot**).
- [ ] Ensure the **coding agent** is enabled for this repository.

### 2. Create and add `COPILOT_ASSIGNMENT_TOKEN`

**Guide:** [SETUP-COPILOT-ASSIGNMENT-TOKEN.md](./SETUP-COPILOT-ASSIGNMENT-TOKEN.md)

- [ ] Create a **Personal Access Token** (classic or fine-grained):
  - **Classic:** scope `repo` (or at least repo + issues).
  - **Fine-grained:** this repo → **Metadata** (read), **Contents** (read), **Issues** (read + write), **Pull requests** (read + write).
- [ ] The user who owns the token must have Copilot / Agents on GitHub.
- [ ] Repo **Settings** → **Secrets and variables** → **Actions** → **New repository secret**  
  - Name: **`COPILOT_ASSIGNMENT_TOKEN`**  
  - Value: the PAT.

### 3. Push your code to the remote

- [ ] Commit and **push** your branch (including `.github/workflows/sonar-copilot-agent-poc.yml`, `scripts/trigger-copilot-via-issue.js`, and any doc changes) to the remote repo. The workflow runs on GitHub, so it must be present on the remote to execute.

### 4. Trigger the POC workflow

**Option A — From a PR (recommended):**

- [ ] Open a PR that has (or will have) Sonar issues (e.g. branch with the induced issues from Phase 1, or any branch that fails Sonar).
- [ ] The workflow **POC — Sonar → Copilot Agent** runs on `pull_request` to main/develop.
- [ ] After Sonar scan and issue fetch, if `found_issues > 0`, the job **Assign to Copilot** runs and creates an issue assigned to Copilot.

**Option B — Manual run:**

- [ ] **Actions** → **POC — Sonar → Copilot Agent** → **Run workflow**.
- [ ] Select a branch that has Sonar issues (or use default). No PR context; issue title/body will be generic and `baseRef` will be the selected branch or main.

### 5. Verify issue creation and assignment

- [ ] In the workflow run, **Assign to Copilot** step completes without error (check logs for “Created issue and assigned to Copilot: …”).
- [ ] In the repo **Issues** tab, a new issue appears (e.g. “Fix SonarQube issues on PR #N (POC)”) and is **assigned to Copilot** (or `copilot-swe-agent`).

### 6. Track in Agents tab and verify fix PR

- [ ] Open the repo **Agents** tab (repository nav: Code, Issues, PRs, **Agents**, …).
- [ ] Find the Copilot session for the created issue; monitor progress if desired.
- [ ] When Copilot finishes, it should open a **fix PR**. Review and merge as usual (e.g. into the contributor’s branch so the original PR gets the fixes).

### 7. Decision after POC

- [ ] **Decide path:** Use in-repo Claude only, Copilot-agent only, or both (e.g. Copilot for teams with licence, in-repo for others).
- [ ] Document the decision (e.g. in this repo or in the Jira ticket).

---

**References:** [POC-COPILOT-AGENT-SONAR.md](./POC-COPILOT-AGENT-SONAR.md) (setup details, workflow, script), [.github/workflows/sonar-copilot-agent-poc.yml](../.github/workflows/sonar-copilot-agent-poc.yml), `scripts/trigger-copilot-via-issue.js`.

---

*Checkpoint recorded so Phase 1 is clearly closed and Phase 2 work is explicitly after this gate.*
