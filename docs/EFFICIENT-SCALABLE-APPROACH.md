# Most Efficient Approach: Agentic PR Review at Scale (Controlled Envs)

Research-backed recommendations for an **efficient**, **scalable**, and **controlled** implementation of the “listen to PR comments → validate → tweak code → reply” flow.

---

## 1. Efficiency: batch over per-comment runs

### Problem with per-comment triggers

- **One workflow run per comment** (`pull_request_review_comment` / `issue_comment` on every comment):
  - N comments → N runs → N × (checkout, install, LLM calls, build, push).
  - More Actions minutes, more API calls, more LLM cost, and risk of overlapping runs on the same PR.

### Recommended: one run per PR, process all unresolved comments

- **Trigger** on a **single event per “review round”**, then process **all unresolved threads** in one job:
  - **Option A (batch on review submit):** Trigger on `pull_request_review` with `types: [submitted]`. When a reviewer submits a review (approve or request changes), the workflow runs once. Use **GraphQL** to fetch all **unresolved** review threads for that PR in **one query** (`reviewThreads(first: 100)`, filter `isResolved: false`). Classify and fix each in the same run; one build/lint; one commit (or one commit per logical fix); reply and resolve each thread.
  - **Option B (explicit command, then batch):** Trigger on `issue_comment` when body contains `/fix` (or `@sonar-fixer address`). Run once per command. In that run, fetch **all unresolved threads** for the PR via GraphQL and process them in one go (same as Option A).
  - **Option C (inline comments with debounce):** Trigger on `pull_request_review_comment` but **debounce** (e.g. wait 60–90 seconds and cancel duplicate runs for the same PR). Use **concurrency** so only one run per PR at a time; the run that proceeds fetches all unresolved threads and processes them in one batch.

**Efficiency gains:**

- Fewer workflow runs → fewer GitHub API calls and lower Actions minutes.
- **One GraphQL query** for all unresolved threads instead of one REST call per comment.
- One install, one build/lint, one push per “round” (or per PR).
- Predictable cost and easier rate-limit management.

**References:** GitHub rate limits (GITHUB_TOKEN 1k req/hr; GitHub App 5k–15k/hr); [GraphQL review threads](https://docs.github.com/en/graphql); [workflow_run debounce](https://github.com/marketplace/actions/workflow-run-debounce).

---

## 2. Scale: rate limits, tokens, and API usage

### Rate limits (GitHub)

- **GITHUB_TOKEN:** 1,000 requests/hour per repository.
- **GitHub App (installation token):** 5,000/hour (up to 15,000/hour on Enterprise). Scales with repos/users.
- **GraphQL:** 5,000 points/hour; one query for `reviewThreads` + comments is far cheaper than many REST calls.

### Best practices at scale

1. **Use GraphQL for reads:** One query to get PR + `reviewThreads(first: 100) { nodes { id, isResolved, path, line, comments(first: 10) { nodes { body, author } } } }`. Fewer round-trips than REST.
2. **Prefer GitHub App** for automation that must scale (e.g. many repos or many PRs). Use installation token; avoid one PAT per repo.
3. **Conditional requests / caching:** If you re-run or retry, use ETag / `If-None-Match` where supported to avoid redundant work.
4. **Retry with backoff:** On 403/429, respect `Retry-After` or `x-ratelimit-reset`; exponential backoff for write operations (e.g. push, post comment).
5. **Batch writes where possible:** Post one summary comment per run instead of one per file when there are many changes; reply to each thread once.

### Concurrency: one run per PR at a time

- Use **concurrency** so only one “address review” run per PR is active:
  - `concurrency: group: address-review-${{ github.event.pull_request.number }}` (or equivalent from event payload).
  - **`cancel-in-progress: true`:** New comment cancels the previous run; the latest run processes the current set of comments (good when reviewers keep adding comments).
  - **`cancel-in-progress: false`:** Queue runs; no cancellation (good if you want every comment round processed; be aware of queue depth and rate limits).

**Reference:** [GitHub Actions concurrency](https://docs.github.com/en/actions/using-jobs/using-concurrency); [GitHub App rate limits](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/rate-limits-for-github-apps).

---

## 3. Controlled environment: security and safety

### Safe trigger patterns (including forks)

- **Problem:** For PRs from **forks**, `pull_request` runs in a restricted context (no secrets, limited write). If you need secrets (e.g. LLM API key) and the ability to push to the PR branch, you must avoid executing **untrusted PR code** with elevated permissions.
- **Recommended pattern (workflow_run):**
  1. **Workflow 1** (trigger: `pull_request`): Runs on the PR branch. Does **not** receive secrets. Can run read-only checks and **produce an artifact** (e.g. list of comments + suggested edits as JSON, or patch files). Does **not** push.
  2. **Workflow 2** (trigger: `workflow_run`, when Workflow 1 completes): Runs in **repository context** (default branch), has secrets. Downloads artifact, applies changes, **pushes to the PR branch** using a token, posts comments, resolves threads. Only **your** workflow code runs with write access; PR code is only used as input to generate the artifact.
- **Controlled env (same-org/same-repo only):** If your policy guarantees PRs are only from the same org/repo (no public forks), you can use **pull_request_target** with strict rules: e.g. checkout only after validating `github.event.pull_request.head.repo.full_name == github.repository`, and never run scripts from the PR. Prefer **workflow_run** for simplicity and consistency with fork-safe setups.

**Reference:** [Netomi: adding comments to PRs safely](https://netomi.github.io/eclipse/2024/08/21/adding-comments-to-pr.html); [GitHub security: preventing pwn requests](https://securitylab.github.com/resources/github-actions-preventing-pwn-requests/).

### Command guard and scoping

- **Command guard:** Run the agent only when the comment contains an explicit command (e.g. `/fix` or `@sonar-fixer address`). Reduces accidental runs and noise.
- **Restrict PRs:** Only run for PRs that match a pattern (e.g. head branch `sonar-ai-fixes-*`) or have a label (e.g. `auto-fix`). Keeps the agent scoped to known automation branches.
- **Restrict comment authors:** If desired, only process comments when `author_association` is `MEMBER`, `OWNER`, or `COLLABORATOR` (configurable). Avoids reacting to drive-by comments.

### Deterministic control plane

- Use **config or rules** (not the LLM) to decide:
  - Whether to run at all (command + PR filter + author).
  - Which classification outcomes lead to code edits (e.g. only `code_change` and `documentation`; never auto-apply on `disagree`).
- Use the LLM only for: classification of the comment, and generation of the edit. This keeps behavior auditable and avoids “model decided to push” surprises.

### Audit and observability

- Post a **summary comment** on the PR after each run: e.g. “Addressed 3 comments (files X, Y, Z). Skipped 1 (question). No change for 1 (not actionable).”
- Log classifications and outcomes (e.g. in workflow logs or a small report artifact) so you can inspect what was done and why.

---

## 4. Recommended architecture (efficient + scalable + controlled)

| Layer | Choice | Reason |
|-------|--------|--------|
| **Trigger** | `pull_request_review` (submitted) **or** `issue_comment` with `/fix` | One run per “review round” or per explicit request; avoids N runs for N comments. |
| **Debounce / concurrency** | Concurrency group per PR; optional debounce (e.g. 60s) if triggering on every comment | Prevents overlapping runs and thundering herd. |
| **Data fetch** | Single GraphQL query for unresolved `reviewThreads` (+ comments) | Minimal API usage; one round-trip. |
| **Processing** | One job: classify all → filter actionable → generate edits (batch or sequential) → apply all (e.g. bottom-to-top) → one build/lint → one commit & push → reply & resolve each thread | Fewer runs, fewer tokens, predictable behavior. |
| **Security (fork-safe)** | workflow_run: WF1 (pull_request) produces artifact; WF2 (workflow_run) applies and pushes | No execution of PR code with secrets. |
| **Security (same-repo only)** | pull_request_target with strict checks, or still workflow_run for consistency | Controlled blast radius. |
| **Token** | GITHUB_TOKEN for single-repo; GitHub App for multi-repo / scale | Stays within rate limits. |
| **Control** | Command guard + PR filter + author check; only code_change/documentation trigger edits | Safe and auditable. |

---

## 5. Summary

- **Most efficient:** Batch processing in **one run per PR (or per review submit / per `/fix`)**; **one GraphQL query** for all unresolved threads; **concurrency** per PR; optional **debounce** if you trigger on every comment.
- **Scale:** Prefer **GraphQL** for reads; **GitHub App** for higher rate limits; **retry/backoff** and **concurrency** to avoid rate limits and duplicate work.
- **Controlled env:** Use **workflow_run** (artifact from `pull_request`, then apply in trusted context) when forks are possible; use **command guard**, **PR/branch/label filters**, and **author checks**; use **deterministic rules** for “when to apply” and **LLM only for classify + edit**; add a **summary comment** and logs for audit.

This gives you an approach that is efficient (fewer runs, fewer API/LLM calls), scalable (rate-limit friendly, batch-oriented), and safe in controlled environments (explicit triggers, no execution of untrusted code with secrets, auditable behavior).
