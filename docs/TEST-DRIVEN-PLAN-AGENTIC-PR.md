# Test-Driven Plan: Agentic PR Review (Address Comments)

A test-first plan for the “listen to PR comments → validate → tweak code → reply” flow. Each phase has **acceptance criteria** (tests) before or alongside implementation.

**Efficiency & scale:** For the most efficient, scalable approach in controlled envs (batch per PR, GraphQL, concurrency, workflow_run for fork safety), see [EFFICIENT-SCALABLE-APPROACH.md](./EFFICIENT-SCALABLE-APPROACH.md). This test-driven plan can be applied to that architecture (e.g. Phase 2–4 run inside a single job that processes all unresolved threads).

---

## Overview

| Phase | What we build | How we test |
|-------|----------------|-------------|
| 0 | Acceptance scenarios (definition) | Manual checklist + later E2E |
| 1 | Workflow triggers + PR branch checkout | Workflow runs on comment; logs show correct ref |
| 2 | Comment classification (actionable vs not) | Unit tests + script with mock payload |
| 3 | Edit generation + apply + validate | Unit tests for classifier; script test with fixture |
| 4 | Reply + resolve (GitHub API) | Script test with mock; optional integration test |
| 5 | End-to-end | Manual: comment on PR → run → reply + fix |

---

## Phase 0: Acceptance criteria (tests first)

Define these as the “tests” we want to pass. Implement until all are green.

### A. Trigger & context

- **A1** When a user posts a **general comment** on a PR (conversation), the workflow runs **only if** the comment is on a PR (not an issue).  
  - *Test:* Run workflow on `issue_comment` with `github.event.issue.pull_request` set; job runs. Run with no pull_request; job skipped (or not triggered).

- **A2** When a user posts an **inline review comment** on a line of the diff, the workflow runs.  
  - *Test:* Trigger workflow with `pull_request_review_comment` created; job runs.

- **A3** (Optional) The workflow runs only when the comment contains a **command** (e.g. `/fix` or `@sonar-fixer address`).  
  - *Test:* Comment with “/fix” → workflow runs; comment without “/fix” → workflow does not run (or job exits early).

- **A4** The job checks out the **PR head branch** (not default branch).  
  - *Test:* After checkout, `git rev-parse HEAD` equals the PR head SHA from the event payload.

### B. Classification (“worth addressing”)

- **B1** A comment that clearly asks for a **code change** (e.g. “rename this to `getDisplayName`”) is classified as **actionable** (e.g. `code_change`).  
  - *Test:* Script with input `{ body: "rename this to getDisplayName", path: "src/App.tsx", line: 10 }` → output classification `code_change` (or equivalent).

- **B2** A comment that is a **question** (e.g. “why did we use a constant here?”) is classified as **not requiring a code edit** (e.g. `question`).  
  - *Test:* Script with input `{ body: "why did we use a constant here?" }` → classification `question`; no edit applied.

- **B3** A comment that is **vague or off-topic** (e.g. “nice”) is classified as **not_actionable**.  
  - *Test:* Input `{ body: "nice" }` → `not_actionable`; no edit.

- **B4** When classification is `disagree` or `not_actionable`, the job **replies** but **does not push** any code change.  
  - *Test:* Run with mock comment “not_actionable”; assert no commit, reply body contains “No code change applied” (or similar).

### C. Edit & validation

- **C1** For an **actionable** comment, the script produces an **edit** (patch or replacement) that can be applied to the repo.  
  - *Test:* Fixture: comment “use DEFAULT_LABEL instead of the string 'todo'”, file path + content. Script outputs a valid replacement; applied file passes build + lint.

- **C2** If the **applied edit breaks build or lint**, the job **does not commit**; it reverts the change and posts a reply (e.g. “Fix failed validation”).  
  - *Test:* Force a bad edit (e.g. introduce syntax error); assert no commit, reply indicates failure.

- **C3** If the edit is valid, the job **commits and pushes** to the PR branch.  
  - *Test:* After run, PR has one new commit; diff matches the intended fix.

### D. Reply & status

- **D1** The job **replies** to the comment (or the review thread) with a short summary of what was done (e.g. “Fixed: renamed to `getDisplayName`.”).  
  - *Test:* After run, the comment thread has a reply from the bot.

- **D2** (Optional) For inline review comments, the job **resolves** the thread.  
  - *Test:* After run, thread is resolved (GraphQL or UI check).

- **D3** The run is visible on the PR (commit status on PR head).  
  - *Test:* PR “Checks” section shows the workflow run for the latest commit.

---

## Phase 1: Workflow triggers + PR branch checkout

**Goal:** Workflow runs on comment; runner checks out PR head.

### Tests (acceptance)

- Trigger on `issue_comment` created when comment is on a PR → job runs; `github.event.issue.number` is the PR number.
- Trigger on `pull_request_review_comment` created → job runs; we have `comment.path`, `comment.line`, `comment.body`.
- Checkout step: ref is PR head ref; `git rev-parse HEAD` equals `github.event.pull_request.head.sha` (for review_comment) or fetched PR head (for issue_comment).

### Implementation

1. Add workflow file (e.g. `sonar-fixer-address-review.yml`) with:
   - `on: issue_comment: types: [created]` and `pull_request_review_comment: types: [created]`.
   - Job `if` for issue_comment: `github.event.issue.pull_request` (and optional command in body).
2. Use `xt0rted/pull-request-comment-branch` for `issue_comment` to get head ref/SHA; for `pull_request_review_comment` use `github.event.pull_request.head.ref` and `head.sha` from payload.
3. Checkout with `ref: ${{ steps.comment-branch.outputs.head_ref }}` (issue_comment) or equivalent for review_comment.
4. Optional: set commit status to “pending” at start and “success”/“failure” at end.

### Verification

- Push workflow; open a test PR; post a comment (with “/fix” if using command guard). Confirm workflow run appears and logs show correct branch and SHA.

---

## Phase 2: Comment classification

**Goal:** Given comment body (and optional path/line), output one of: `code_change` | `documentation` | `question` | `not_actionable` | `disagree`.

### Tests (unit / script)

- **T2.1** “Rename this to getDisplayName” → `code_change`.
- **T2.2** “Add a JSDoc for this function” → `documentation`.
- **T2.3** “Why did we use a constant here?” → `question`.
- **T2.4** “nice” / “lgtm” → `not_actionable`.
- **T2.5** “I disagree, we should keep it as is” → `disagree`.

Implement a small script (e.g. `scripts/classify-review-comment.js`) that reads `COMMENT_BODY` (and optional path/line) from env, calls Claude, parses classification, and prints it to stdout (or writes to a file).  
Run with mock env in CI or locally: `COMMENT_BODY="Rename this to getDisplayName" node scripts/classify-review-comment.js` → assert output contains `code_change`.

### Implementation

1. Add `scripts/classify-review-comment.js`: read env, call Claude with a short prompt, parse response (e.g. JSON or single token), output classification.
2. Add a small test runner (e.g. `scripts/test-classify.sh` or Node test) that runs 5 cases above and asserts.
3. In the workflow, run this script; if result is `not_actionable` or `disagree`, post reply and exit without editing.

### Verification

- Run test script; all 5 cases pass. In workflow, use a “question” comment and confirm job exits after reply, no commit.

---

## Phase 3: Edit generation + apply + validate

**Goal:** For `code_change` / `documentation`, generate an edit, apply it, run build + lint; if fail, revert and reply.

### Tests

- **T3.1** Fixture: file `src/foo.ts` with one line; comment “replace with bar”. Script outputs replacement; after apply, file contains “bar”; build + lint pass.
- **T3.2** Force invalid edit (e.g. break syntax). Script or workflow reverts change; no commit; reply says validation failed.

### Implementation

1. Add `scripts/address-pr-review.js` (or extend): inputs from env (comment body, path, line, file content or repo path). Call Claude to generate a replacement snippet (same pattern as Sonar fixer). Apply via string replace or patch.
2. Run `pnpm run build` and `pnpm run lint` in the workflow after apply. On failure: `git checkout -- .`, post reply, exit 1.
3. On success: output “success” and reply text for the next phase.

### Verification

- Local: run script with fixture; assert file content and build/lint. In workflow, use a real “code_change” comment; confirm one commit and green build.

---

## Phase 4: Reply + resolve (GitHub API)

**Goal:** Post reply to the comment; optionally resolve the thread (inline); set commit status.

### Tests

- **T4.1** With `GITHUB_TOKEN` and comment ID, reply is created (use `actions/github-script` or Node `octokit`). Verification: manual or integration test on a real PR.
- **T4.2** Commit status is set on PR head SHA. Verification: PR “Checks” tab shows the run.

### Implementation

1. In workflow, after successful commit + push: `github.rest.pulls.createReplyForReviewComment` (for inline) or `issues.createComment` (for PR-level). Body: “Fixed: …” or “No code change applied; …”.
2. Optional: GraphQL `resolveReviewThread` for inline comments.
3. Set commit status on PR head: pending at start, success/failure at end (e.g. `myrotvorets/set-commit-status-action` or REST API).

### Verification

- Post comment on test PR; after run, comment has a reply; status check shows on PR.

---

## Phase 5: End-to-end (manual test matrix)

Run these manually (or automate with a script that posts comments via API) to confirm full flow.

| # | Scenario | Comment | Expected |
|---|----------|---------|----------|
| E1 | PR conversation | “/fix please rename getStatus to getTodoStatus” | Workflow runs; code updated; reply on comment; new commit on PR. |
| E2 | PR conversation | “why did we use a constant here?” | Workflow runs; no code change; reply “No code change applied; question.” (or similar). |
| E3 | Inline review | On a line: “use DEFAULT_LABEL here” | Workflow runs; fix applied; reply; thread resolved. |
| E4 | Inline review | “nice” | Workflow runs; no edit; reply; no commit. |
| E5 | Bad fix | Comment that would lead to invalid code (if possible to craft) | Workflow runs; no commit; reply “Fix failed validation.” |

---

## Implementation order (test-driven)

1. **Phase 0** – Document acceptance criteria (this doc); no code.
2. **Phase 1** – Workflow + checkout; verify with one manual trigger (comment on PR). *Efficient:* use `pull_request_review` (submitted) or `issue_comment` with `/fix`; concurrency group per PR.
3. **Phase 2** – Classification script + 5 unit tests; wire workflow to exit on “not_actionable”/“disagree” with reply. *Efficient:* run classification for **all** unresolved threads in one job (GraphQL fetch once).
4. **Phase 3** – Edit script + fixture test; wire workflow to apply + build/lint + revert on failure. *Efficient:* process all actionable comments in one run; one build/lint; one commit (or one per logical group).
5. **Phase 4** – Reply + status in workflow; verify with one successful and one “no change” comment. *Efficient:* batch replies; set status once per run.
6. **Phase 5** – Run full E2E matrix; fix any gaps.

---

## Where tests live

- **Unit / script tests:** `scripts/classify-review-comment.js` + `scripts/test-classify.sh` (or `test/address-pr-review.test.js`). Optionally add to `package.json` scripts (e.g. `pnpm run test:classify`).
- **Fixture:** `scripts/fixtures/review-comment-*.json` for comment + file context; expected classification or expected file content after edit.
- **Workflow:** No separate “test workflow”; we verify by triggering the real workflow on a test PR and checking logs + PR state.
- **E2E:** Manual checklist (Phase 5 table) or a script that uses GitHub API to create PR, post comment, poll for run and reply.

This keeps the plan test-driven: we define the expected behavior first (Phases 0 and 5), then implement in small steps (Phases 1–4), each verifiable by trigger, script output, or manual run.
