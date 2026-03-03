# POC: SonarQube Issues → GitHub Copilot Agent (Agents on GitHub)

This POC uses **[Agents on GitHub](https://github.com/features/copilot/agents)** so that when a contributor’s PR has SonarQube issues, **GitHub Copilot** (the coding agent) is assigned an issue and opens a fix PR, instead of the in-repo Claude script.

**Phase 2 runbook:** For a step-by-step execution checklist (enable Copilot, add token, trigger, verify issue + Agents tab + fix PR), see **[CHECKPOINT-PHASE1-TO-PHASE2.md](./CHECKPOINT-PHASE1-TO-PHASE2.md#phase-2-execution-runbook)**.

---

## Flow

1. Contributor opens a PR → workflow **POC — Sonar → Copilot Agent** runs.
2. Sonar scan runs; issues are fetched from the Sonar API.
3. If there are issues, the workflow **creates a GitHub issue** with context (PR number, branch, issue count) and **assigns it to Copilot** via the [Issue Assignment API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue).
4. **Copilot** (cloud) picks up the issue, works in its environment, and opens a **fix PR**. You can track the task in the repo **Agents** tab.
5. The contributor (or maintainer) reviews and merges Copilot’s PR.

---

## Setup

### 1. Enable Copilot coding agent for the repo

- **Settings** → **Copilot** → ensure the **coding agent** is enabled for this repository (and that your plan includes [Agents on GitHub](https://github.com/features/copilot/agents)).

### 2. Create a token that can assign issues to Copilot

**Step-by-step guide:** [SETUP-COPILOT-ASSIGNMENT-TOKEN.md](./SETUP-COPILOT-ASSIGNMENT-TOKEN.md)

`GITHUB_TOKEN` (the automatic Actions token) and `COPILOT_ASSIGNMENT_TOKEN` are **not** the same: the former is repo-scoped and not a user identity; the **Issue Assignment API** (assigning an issue to Copilot) typically requires a **user** token. The default `GITHUB_TOKEN` in Actions often **cannot** assign issues to Copilot, so you need a **user** token:

- **Fine-grained PAT:** Repo → **Metadata** (read), **Contents** (read), **Issues** (read + write), **Pull requests** (read + write). The user who creates the token must have Copilot.
- **Classic PAT:** Scope `repo` (or at least the repo and issues scope).

Create the token at: GitHub → Settings → Developer settings → Personal access tokens.

**Try first without a secret:** The script falls back to `GITHUB_TOKEN` if `COPILOT_ASSIGNMENT_TOKEN` is not set. Run the POC once; if the “Assign to Copilot” step fails (e.g. permission or assignment error), add the user PAT as `COPILOT_ASSIGNMENT_TOKEN`.

### 3. Add the token as a repository secret

- **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
- Name: **`COPILOT_ASSIGNMENT_TOKEN`**
- Value: the PAT from step 2.

### 4. Sonar (for issue detection)

The POC workflow reuses the same Sonar step as the main flow. Ensure:

- **`SONAR_TOKEN`** and **`SONAR_HOST_URL`** are set (e.g. SonarCloud).
- Optionally **`vars.SONAR_PROJECT`** if your project key is different.

---

## Workflow and script

| Item | Description |
|------|-------------|
| **Workflow** | `.github/workflows/sonar-copilot-agent-poc.yml` — runs on `pull_request` (and `workflow_dispatch` for testing). Runs Sonar, fetches issues; if any, calls the trigger script. |
| **Script** | `scripts/trigger-copilot-via-issue.js` — GraphQL: get repo ID + Copilot bot ID, then `createIssue` with `assigneeIds` and `agentAssignment` (target repo, `baseRef` = PR head branch, custom instructions). |

The issue title/body and `agentAssignment.baseRef` are set so Copilot is asked to work on the **contributor’s branch** and open a PR that targets it (so the fix can be merged into the original PR).

---

## How to run the POC

**Push first:** Ensure the workflow and scripts are pushed to the remote; Actions run on GitHub, so the repo must have the latest code.

1. **From a PR:** Open a PR that introduces (or already has) Sonar issues. The workflow runs automatically. If Sonar finds issues and `COPILOT_ASSIGNMENT_TOKEN` is set, an issue is created and assigned to Copilot.
2. **Manual run:** **Actions** → **POC — Sonar → Copilot Agent** → **Run workflow**. Choose branch (e.g. a branch that has Sonar issues). No PR context is passed; the created issue will have a generic title and `baseRef` defaulting to the branch you ran from or `main`.

---

## What to expect

- **Issue:** A new issue appears in the repo (e.g. “Fix SonarQube issues on PR #42 (POC)”) and is **assigned to Copilot**.
- **Agents tab:** In the repo, open the **Agents** tab. You should see a Copilot session for that issue; you can monitor and steer from there.
- **Fix PR:** When Copilot finishes, it opens a PR. Review and merge as usual.

---

## Comparison with in-repo AI fix

| | **POC (Copilot agent)** | **In-repo (sonar-ai-fix.yml)** |
|--|--------------------------|----------------------------------|
| **Who fixes** | GitHub Copilot (cloud) | Claude via `scripts/ai-fix-sonar.js` |
| **Trigger** | Create issue + assign to Copilot | Same workflow applies fixes and runs create-pull-request |
| **Secrets** | `COPILOT_ASSIGNMENT_TOKEN` (user PAT) + Sonar | `ANTHROPIC_API_KEY` + Sonar |
| **Tracking** | Repo **Agents** tab | Workflow run + created PR |
| **Licensing** | Requires Copilot / Agents on GitHub | Only Anthropic API key |

Use this POC to validate the Copilot-agent path; if you prefer no Copilot dependency, keep using the in-repo Sonar AI fix workflow.
