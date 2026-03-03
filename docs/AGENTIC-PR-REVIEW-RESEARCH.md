# Agentic PR Review: Listen to Comments & Autonomously Tweak the PR

Research summary and implementation plan for making the fixer agent **listen to human reviewer comments** on the PR, **validate whether the comment is worth addressing**, and **tweak the code** (more autonomy).

**See also:**
- [CONTRIBUTOR-PR-SONAR-AGENT-FIX.md](./CONTRIBUTOR-PR-SONAR-AGENT-FIX.md) — **Contributor PR → Sonar reports issues → agent auto-picks and raises fix PR** (how it works, and optional Copilot path).
- [EFFICIENT-SCALABLE-APPROACH.md](./EFFICIENT-SCALABLE-APPROACH.md) — most efficient approach at scale in controlled envs (batch, concurrency, workflow_run, GraphQL, command guard).
- [AUTONOMOUS-AGENTS-VS-WORKFLOWS.md](./AUTONOMOUS-AGENTS-VS-WORKFLOWS.md) — autonomous agents (24/7 background) vs manual GH workflows; when each fits and how to get an “always on” feel with controlled cost.
- [GITHUB-AGENTS-TAB.md](./GITHUB-AGENTS-TAB.md) — GitHub’s new **Agents tab** (repo UI for Copilot coding agent sessions), custom agents, and how it differs from Agentic Workflows and our YAML.

---

## 1. Research summary

### 1.1 How others do it

| Source | Approach |
|--------|----------|
| **GitHub Copilot Coding Agent** | Mention `@copilot` in a PR comment; agent evaluates the task, makes changes, and updates the PR. You can iterate with more comments. |
| **Pullfrog** | Open-source GitHub integration. Tag `@pullfrog` to trigger; supports “Address Reviews” mode to automatically address review feedback on the agent’s own PRs. Uses PR creation, “PR review created”, “PR review requested” triggers. |
| **Claude PR Reviewer (marketplace)** | Mention `@claude` in PR comments for additional reviews or questions; agent responds via Actions. |
| **PR Pilot** | Agent-driven GitHub Action workflows; AI agents in the loop with configurable behavior. |
| **Cory Lanou (Gist)** | Skill: fetch unresolved review threads (GraphQL), categorize (code change / docs / question / disagree), fix with Read/Edit, reply to comment, resolve thread, commit, request re-review. |
| **Google (ML code review)** | ~7.5% of reviewer comments addressed by ML-suggested edits; large time-saving potential. |
| **LLM-as-judge (2024)** | Comments classified into: readability, bugs, maintainability, design, no issue. Most likely to lead to code changes: concise, with code snippets, from humans, at hunk level. |

### 1.2 GitHub events: what to listen to

- **General PR conversation comments** (comment on the PR body / discussion):  
  → Use **`issue_comment`** with `types: [created]`.  
  Filter with `if: github.event.issue.pull_request` so you only run when the comment is on a PR (not on a plain issue).

- **Inline review comments** (comment on a specific line of the diff):  
  → Use **`pull_request_review_comment`** with `types: [created]`.  
  Payload includes `comment.body`, `comment.path`, `comment.line`, `comment.diff_hunk`, and PR/repo context.

- **Full review submitted** (approve / request changes + body):  
  → **`pull_request_review`** with `types: [submitted]`.  
  You get the review body and state (approved / changes_requested); you can also list review comments via API.

For “human reviewer made a comment”, you typically want **both**:
- **`issue_comment`** → comments on the PR conversation.
- **`pull_request_review_comment`** → comments on specific lines (most actionable for code changes).

### 1.3 Caveats when using `issue_comment`

- The workflow runs in the **default branch** context (`GITHUB_REF` = default branch), not the PR head.  
- To work on the **PR branch**: use something like `xt0rted/pull-request-comment-branch` (or the GitHub API) to get the PR head ref/SHA, then checkout that ref.  
- To show the run on the PR: set the **commit status** on the PR head SHA (e.g. with `myrotvorets/set-commit-status-action`) so the check appears on the PR.  
- Post results back with **`actions/github-script`** (e.g. `issues.createComment`) so reviewers see the agent’s reply/summary on the same PR.

### 1.4 Validating “is this comment worth addressing?”

- **Taxonomy (research):** Code change / Documentation / Question / Disagree or won’t fix. Only the first two (and sometimes Question with “add a comment”) are auto-actionable; “disagree” should ask the user.  
- **Signals that a comment is actionable:** Short, includes code snippet, refers to a specific line/hunk, asks for a concrete change (naming, logic, style).  
- **Implementation:** Use the LLM in the workflow to classify the comment (e.g. “code_change” / “documentation” / “question” / “not_actionable” / “disagree”). Only run “apply code change” when the classification is code_change (and optionally documentation). Optionally require a **command** (e.g. “/fix” or “@bot address”) so the agent doesn’t react to every casual comment.

---

## 2. Proposed design for this repo

### 2.1 Goals

- When a **human** comments on the **AI-generated Sonar fix PR** (or any PR), the **fixer agent**:
  1. **Listens** (workflow triggered by `issue_comment` and/or `pull_request_review_comment`).
  2. **Validates** whether the comment is worth addressing (LLM or rules: actionable vs question vs disagree).
  3. **Tweaks the code** on the same PR branch (checkout PR head, apply edits, commit, push).
  4. **Replies** to the comment and optionally resolves the thread (for inline comments).
  5. Optionally posts a short summary on the PR (“Addressed review feedback: …”).

### 2.2 Triggers

- **Option A – Comment on PR conversation**  
  - `on: issue_comment: types: [created]`  
  - `if: github.event.issue.pull_request`  
  - Optionally: only run if body contains a command (e.g. `/fix` or `@sonar-fixer address`) to avoid reacting to every message.

- **Option B – Inline review comment**  
  - `on: pull_request_review_comment: types: [created]`  
  - Rich context: `path`, `line`, `diff_hunk`, `body`. Best for “change this line” feedback.

- **Option C – Both**  
  - One workflow with two trigger blocks; shared job that receives event type and payload (comment body, path, line, PR number, etc.).

### 2.3 Flow (single job)

1. **Checkout PR branch**  
   - For `issue_comment`: get PR number from `github.event.issue.number`, then use API or `xt0rted/pull-request-comment-branch` to get head ref/SHA and checkout.  
   - For `pull_request_review_comment`: `github.event.pull_request.head.sha` and ref are in the payload; checkout that ref.

2. **Gather comment context**  
   - Body, author, path (if inline), line (if inline), diff_hunk (if inline).  
   - Optionally: fetch other unresolved review threads (GraphQL) so the agent can address multiple comments in one run.

3. **Validate “worth addressing”**  
   - Call Claude (or a small classifier) with prompt: “Given this PR review comment, classify: code_change | documentation | question | not_actionable | disagree. If code_change or documentation, extract a short instruction.”  
   - If result is `not_actionable` or `disagree`, post a short reply (“No code change applied; [reason].”) and exit without editing.

4. **Generate and apply edit**  
   - Same pattern as Sonar fixer: send comment + (optional) file path + line + surrounding code to Claude; get a patch or replacement snippet; apply via script (or apply from Claude’s output).  
   - Run **build + lint** (and optional tests). If they fail, revert the edit, post “Fix failed validation; please rephrase or apply manually.” and exit.

5. **Commit and push**  
   - Single commit, e.g. `fix: address review comment (path:line)` or `fix(review): ...`.  
   - Push to the PR head branch.

6. **Reply and optional resolve**  
   - **Reply to comment:** REST API `pulls/createReplyForReviewComment` (or `issues.createComment` for PR-level).  
   - **Resolve thread:** GraphQL `resolveReviewThread` (for inline comments).  
   - Optional: add a PR-level comment summarizing what was addressed.

7. **Status check**  
   - Set commit status on PR head to success/failure so the run is visible on the PR.

### 2.4 Safety and control

- **Only react on command** (e.g. “/fix” or “@sonar-fixer address”) to avoid touching code on every comment.  
- **Restrict which PRs** (e.g. only PRs from branch `sonar-ai-fixes-*` or only when a label is present).  
- **Disagree / not_actionable:** never auto-apply; reply and stop.  
- **Validation gate:** if build/lint fails after the edit, do not push; report back in comment.

### 2.5 Implementation pieces

- **New workflow file** (e.g. `.github/workflows/sonar-fixer-address-review.yml`):
  - Triggers: `issue_comment` (created) and `pull_request_review_comment` (created).
  - One job that checks out PR branch, runs a Node script (or composite action) that: reads event payload, calls Claude for classification and for edit, applies edit, runs build/lint, commits and pushes, then uses GitHub API to reply and resolve.
- **New script** (e.g. `scripts/address-pr-review.js`):
  - Inputs: `COMMENT_BODY`, `COMMENT_PATH`, `COMMENT_LINE`, `EVENT_TYPE`, `PR_NUMBER`, `PR_HEAD_REF`, `PR_HEAD_SHA`.  
  - Steps: classify comment → if actionable, generate diff → apply → validate → output “success” + reply text; else output “skip” + reply text.
- **Secrets:** `ANTHROPIC_API_KEY` (already used).  
- **Permissions:** `contents: write`, `pull-requests: write` (to push and to reply/resolve).

---

## 3. References

- [GitHub: Events that trigger workflows — issue_comment, pull_request_review_comment](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
- [Trigger GitHub Workflow for Comment on Pull Request (dev.to)](https://dev.to/zirkelc/trigger-github-workflow-for-comment-on-pull-request-45l2) — PR branch checkout, commit status, post comment
- [Claude Code skill: Address PR review comments (Gist)](https://gist.github.com/corylanou/a381082d38b693792eed659bcdab09d0) — GraphQL threads, categorize, fix, reply, resolve
- [Pullfrog](https://pullfrog.ai/) — Address Reviews mode for agent PRs
- [Does AI Code Review Lead to Code Changes? (arXiv 2024)](https://arxiv.org/html/2508.18771) — what makes comments lead to changes
- [Resolving Code Review Comments with ML (Google)](https://storage.googleapis.com/gweb-research2023-media/pubtools/7525.pdf)

---

## 4. Next steps

1. Add workflow triggers for `issue_comment` and `pull_request_review_comment` (with optional command guard).  
2. Implement PR-branch checkout and comment context extraction.  
3. Implement `scripts/address-pr-review.js` (classify → generate edit → apply → validate).  
4. Add reply and optional resolve via GitHub API.  
5. Add commit status so the run appears on the PR.  
6. Test on a Sonar fix PR: post a comment, confirm the agent replies and pushes a fix only when the comment is actionable.

This gives you an **agentic experience** where the fixer “listens” to the human reviewer and autonomously tweaks the PR after validating that the comment is worth addressing.
