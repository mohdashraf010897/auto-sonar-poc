# Plan: Self‑provoked autonomous Sonar fixer pipeline

This repo is reset to **report only**: the workflow fetches SonarCloud issues and opens/updates a PR with the issue list. No automatic fixes.

The plan below is the target design for adding an **auto-fixer** that:

1. Fetches SonarQube/SonarCloud issues
2. Uses an LLM to propose fixes
3. Applies changes in a branch, runs tests/scan
4. Opens a PR with the fixes

---

## Architecture options

**Option A — All inside GitHub Actions (recommended first)**  
- Scheduled or webhook-triggered workflow.  
- Steps: fetch issues → filter actionable → checkout → (per issue or batch) ask LLM for patch → apply → run tests + Sonar scan → open PR if checks pass.

**Option B — External service**  
- Small always-on service (VM/container) listens for Sonar webhooks or runs on a schedule, same logic, uses `gh` or GitHub API to open PRs. Better for local LLMs (Ollama/TGI) needing GPUs or persistent state.

---

## Safety controls (do these)

- **Limit scope**: auto-fix only small, low-risk issues (e.g. formatting, trivial code smells). Require human review; do not auto-merge.
- **Run tests and re-scan** before opening PRs. Reject changes that fail tests or reintroduce issues.
- **Secrets**: store `SONAR_URL`, `SONAR_TOKEN`, `LLM_API_KEY`, `GITHUB_TOKEN` in GitHub Secrets; least privilege.
- **Human in the loop** for security-related or large diffs.
- **Guard prompt injection** if code can influence prompts; sanitize inputs and keep file diffs local.

---

## Concrete implementation (GitHub Actions + Python)

### Secrets / variables

- `SONAR_TOKEN` — SonarCloud auth token
- `ANTHROPIC_API_KEY` — Anthropic API key for Claude
- `GITHUB_TOKEN` — from Actions (for create-pull-request)
- **Var:** `SONAR_PROJECT` — SonarCloud project key (optional; default used if unset)

### Workflow outline (article-strict: sonar-ai-fix.yml)

`.github/workflows/sonar-ai-fix.yml` (follows [Markaicode article](https://markaicode.com/sonarqube-ai-auto-fix-code-smells/) strictly):

- **Triggers**: `pull_request` (main, develop), `push` (main).
- **Steps**: Checkout → **SonarQube Scan** (`sonarqube-scan-action@v2`) → Get SonarQube Issues (sleep 10, curl, `found_issues` from `.total`) → Setup Node 22 → Install deps → `node scripts/ai-fix-sonar.js` → Apply fixes (inline script) → build + lint → Security scan (grep eval/dangerouslySetInnerHTML) → `peter-evans/create-pull-request@v6`.
- **Script**: `scripts/ai-fix-sonar.js` (article logic: ±5 lines, Claude, `ai-fixes.json`).

### Core script (`auto_sonar_fix.py`)

- **Fetch issues**: `GET {SONAR_URL}/api/issues/search?componentKeys={project}&resolved=false&ps=...`
- **Filter**: e.g. `ALLOWED_RULE_KEYS = ["java:S1192", "python:S112"]` (whitelist low-risk rules only).
- **Per issue (or batched)**:
  - Resolve file path from `component`.
  - Read file; build prompt: issue message, rule, file path, code. Ask LLM for **full updated file content** (or unified diff, then apply).
  - Create branch (e.g. `auto/sonarfix/{issue_key}`), write patched file, commit.
  - Run tests (e.g. `pytest`, `pnpm test`, or `pnpm run build && pnpm run lint`).
  - If tests pass: push branch, open PR (e.g. `gh pr create --title "..." --body "..." --head {branch}`).
  - If tests fail: discard branch, checkout main.
- **Limits**: `MAX_ISSUES`, `MAX_FILE_CHANGES`; refuse large patches.

### LLM provider (programmatic)

- **OpenRouter** — OpenAI-compatible, good for prototyping; can use free community models.
- **Hugging Face Inference** — code models (StarCoder, CodeLlama); rate limits on free tier.
- **OpenAI** — paid, high quality.
- **Ollama / self-hosted** — privacy and control; needs runner or external service with GPU.

---

## Reference: Markaicode (tested & documented)

**[Auto-Fix SonarQube Code Smells with AI in 20 Minutes](https://markaicode.com/sonarqube-ai-auto-fix-code-smells/)** — production-oriented, well-tested approach. Summary:

| Step | What they do |
|------|----------------|
| 1 | SonarQube scan in CI (`sonarqube-scan-action`), then fetch issues via API (`/api/issues/search`, `componentKeys`, `severities=MAJOR,CRITICAL,BLOCKER`). |
| 2 | **Node.js script** + **Anthropic Claude**: for each issue, read file → take **±5 lines around `issue.line`** as context → prompt: rule, message, severity, file, line + code block → ask for **fixed code for that context only** (no explanation). Strip markdown from response, store in `ai-fixes.json`. |
| 3 | **Apply fixes**: replace `fix.original` with `fix.fixed` in each file. Then **`npm test`** and **`npm run lint`**. If either fails, skip or log (don’t merge). |
| 4 | **Create PR** with `peter-evans/create-pull-request@v6` (branch e.g. `sonar-ai-fixes-$run_number`). Human review before merge. |
| 5 | **Safety**: optional grep for `eval(`, `dangerouslySetInnerHTML`; Semgrep on modified files. **Batching**: group issues by file → one API call per file to cut cost. |

**Implementation:** Single flow in `.github/workflows/sonar-ai-fix.yml` + `scripts/ai-fix-sonar.js`; apply fixes inline in the workflow, then build/lint → `create-pull-request`.

---

## References

- **[Markaicode: SonarQube AI Auto-Fix](https://markaicode.com/sonarqube-ai-auto-fix-code-smells/)** — reference implementation (Node, Claude, 20 min).
- [Sonar Web API](https://docs.sonarsource.com/sonarqube-server/extension-guide/web-api)
- [Sonar GitHub Actions integration](https://docs.sonarsource.com/sonarqube-server/devops-platform-integration/github-integration/adding-analysis-to-github-actions-workflow)
- [Using an LLM in GitHub Actions](https://tonybaloney.github.io/posts/using-llm-in-github-actions.html)
- [PR automation examples](https://github.com/vblagoje/pr-auto)

---

## Status

Single auto-fix flow: `.github/workflows/sonar-ai-fix.yml` (scan → fetch → AI fixes → apply → build/lint → security check → PR). Configure `SONAR_TOKEN`, `SONAR_HOST_URL`, `ANTHROPIC_API_KEY` and optional `SONAR_PROJECT`; trigger on push to main or PR to main/develop.
