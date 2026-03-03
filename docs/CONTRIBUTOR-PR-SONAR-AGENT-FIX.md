# Contributor PR → SonarQube Issues → Agent Fix PR

When a **contributor raises a PR**, Sonar (GitHub integration) reports issues on that PR. This doc describes how the **agent** auto-picks those issues and **raises a fix PR** to address them.

---

## Flow

1. **Contributor opens a PR** (e.g. `feature/xyz` → `main`).
2. **Sonar runs** (in this repo: same workflow runs on the PR; Sonar scan + fetch issues from Sonar API). Sonar also reports on the PR via the GitHub integration (status, comments, etc.).
3. **Agent auto-picks issues** — the workflow fetches the list of issues from the Sonar API and passes them to the AI fixer (Claude).
4. **Agent raises a fix PR** — fixes are applied, build/lint run; then a new PR is created that **targets the contributor’s branch** (`feature/xyz`), not main.
5. **Contributor merges the fix PR** into their branch; the original PR is updated and now includes the fixes. They can then get the main PR reviewed and merged.

So the contributor never has to “fix Sonar by hand”—they get a **“🤖 AI Fix: SonarQube Code Quality Issues”** PR into their branch and merge it.

---

## How it’s implemented (this repo)

**Workflow:** `.github/workflows/sonar-ai-fix.yml`

- **Trigger:** `pull_request` (and `push` to main).
- **On `pull_request`:** Checkout uses the **PR head** (`github.head_ref`), so the code the workflow runs on is the contributor’s branch. After Sonar scan and issue fetch, the AI generates fixes and applies them. `peter-evans/create-pull-request` then creates a new branch from that state and opens a PR. Because the checkout was the contributor’s branch, **that PR targets the contributor’s branch** (e.g. `sonar-ai-fixes-123` → `feature/xyz`).
- **On `push` to main:** Checkout is main; the fix PR targets the default branch.

So “agent” here is the **in-repo automation**: Sonar API + `scripts/ai-fix-sonar.js` (Claude) + create-pull-request. No separate Copilot coding agent is required.

**Checkpoint:** Phase 1 (this flow) is complete and validated. Before Phase 2 (Copilot POC), see [CHECKPOINT-PHASE1-TO-PHASE2.md](./CHECKPOINT-PHASE1-TO-PHASE2.md).

---

## POC: Use GitHub Copilot (Agents on GitHub) instead

A **proof-of-concept** workflow uses the **Copilot coding agent** ([Agents on GitHub](https://github.com/features/copilot/agents)) to open the fix PR:

1. After Sonar reports issues (e.g. in a separate workflow or when the Sonar check completes), have a job that **creates an issue** with title/body like: “Fix SonarQube issues reported on PR #123. Branch: feature/xyz. See [Sonar report link].”
2. **Assign that issue to Copilot** via the [Issue Assignment API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue) (REST or GraphQL), with `agentAssignment.baseRef` set to the PR head branch if you want the agent to branch from the contributor’s branch.
3. Copilot (cloud) will pick up the issue and open a PR. You can track it from the repo **Agents** tab.

That gives you “Sonar issues → agent fix PR” with the **cloud** Copilot agent instead of the in-repo Claude script. For a fully automated, in-repo path that doesn’t depend on Copilot licensing, the current **sonar-ai-fix** workflow is the one in use.

**Implemented POC:** Workflow **`sonar-copilot-agent-poc.yml`** and script **`scripts/trigger-copilot-via-issue.js`** create an issue and assign it to Copilot when Sonar finds issues on a PR. Full setup: [POC-COPILOT-AGENT-SONAR.md](./POC-COPILOT-AGENT-SONAR.md).

---

## Summary


| Approach                         | Who raises the fix PR                           | Target of fix PR                                       |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------------ |
| **This repo (sonar-ai-fix.yml)** | In-repo workflow (Claude + create-pull-request) | Contributor’s branch (on PR trigger) or main (on push) |
| **POC: Copilot** ([POC-COPILOT-AGENT-SONAR.md](./POC-COPILOT-AGENT-SONAR.md)) | GitHub Copilot coding agent                     | Configurable (e.g. baseRef = contributor’s branch)     |


“Contributor raises PR → Sonar reports issues → agent auto-picks and raises fix PR” is implemented by the **sonar-ai-fix** workflow; the fix PR targets the contributor’s branch so they can merge it into their PR.