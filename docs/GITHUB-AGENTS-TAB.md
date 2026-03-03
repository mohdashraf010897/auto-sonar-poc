# GitHub Agents Tab (New Repo Feature)

GitHub added a new **Agents** tab at the repository level (Jan 2026) for managing coding agent sessions. This doc summarizes what it is, how it differs from Agentic Workflows and from our custom YAML workflows, and how it could relate to the Sonar fixer and PR review automation.

**Official feature page:** [Agents on GitHub](https://github.com/features/copilot/agents) — “Your code’s favorite coding agents”: Copilot (and third-party agents like Claude, Codex, or custom agents) writing PRs, handling edits, responding to @mentions; mission control to manage and steer tasks; assign from Issues, Azure Boards, Raycast, Linear, VS Code, CLI, Slack, or Teams.

---

## 1. What is the Agents tab?

The **Agents tab** is a repository-level UI (alongside Code, Pull requests, Issues, etc.) that acts as a **mission control** for **GitHub Copilot coding agent** (and third-party/custom agents).

- **Where:** In any repo with Copilot coding agent enabled: **Repository → Agents**.
- **What it does:** You create tasks, monitor live sessions, steer agents mid-session, and jump to the PR the agent opened. Session logs show grouped tool calls, inline file diffs, and bash commands.

### Main capabilities (from docs and changelog)

- **Create tasks:** Describe what you want in natural language (e.g. “Implement a user-friendly message for common errors”). Optionally choose AI model (Copilot, Claude, Codex), **custom agent**, and base branch.
- **Monitor sessions:** All agent sessions for the repo in one list; click a session to see live logs, tool calls, and progress.
- **Steer mid-session:** Add follow-up instructions while the agent is running (e.g. “Use our existing ErrorHandler utility instead of custom try-catch”). Uses one premium request per steering message. (Steering not available for third-party agents.)
- **Review and merge:** One-click link to the PR the agent created; review, request changes, or merge from there.
- **Resume elsewhere:** “Continue in Copilot CLI” or “Open in VS Code” to pick up the same session locally.
- **Archive:** Archive stopped sessions to keep the list tidy.

**References:**  
[Introducing the Agents tab in your repository (Changelog)](https://github.blog/changelog/2026-01-26-introducing-the-agents-tab-in-your-repository)  
[About agent management](https://docs.github.com/en/copilot/concepts/agents/coding-agent/agent-management)  
[Managing coding agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/manage-agents)

---

## 2. What is the Copilot coding agent?

The **Copilot coding agent** is the autonomous AI that actually does the work you see in the Agents tab:

- Runs in a **GitHub Actions–powered** environment.
- Takes a **task** (from the Agents tab, Copilot Chat `/task`, or other entry points), creates a branch, makes changes, and opens a **pull request**.
- You stay in the loop by reviewing (and optionally steering) the session and the PR; CI runs on the PR as usual.
- Supports **Copilot**, **Claude**, and **Codex**; plus **custom agents** (task-specific system prompts and tools).

So: **Agents tab = UI and session management.** **Coding agent = the runtime** that executes tasks and produces PRs.

---

## 3. Agents tab vs Agentic Workflows vs our YAML workflows

| | **Agents tab + Coding agent** | **GitHub Agentic Workflows (gh-aw)** | **Our custom YAML (e.g. sonar-ai-fix)** |
|--|-------------------------------|--------------------------------------|----------------------------------------|
| **Trigger** | **Manual (or chat):** You create a task in the UI (or `/task`). One task → one session → one PR. | **Event or schedule:** e.g. `on: pull_request`, `on: issue_comment`, `on: schedule: daily`. | **Event or schedule:** e.g. `on: pull_request`, `on: push`. |
| **Definition** | Natural language task + optional custom agent. No YAML in repo for the task itself. | **Markdown** workflow files (`.github/aw/` or similar) with frontmatter + instructions; compiled to Actions. | **YAML** in `.github/workflows/`. |
| **Automation** | **On demand:** You (or someone) must start each task. Good for ad‑hoc work, not “on every PR” by default. | **Automatic:** Runs on every matching event or on a schedule. Good for continuous automation. | **Automatic:** Runs on every matching event (or schedule). Full control over triggers and steps. |
| **Where it runs** | GitHub-hosted agent runtime (Actions-backed). | GitHub Actions (compiled from markdown). | GitHub Actions. |
| **Output** | PR with agent’s changes; you review/merge from the Agents tab or the PR. | Depends on workflow (comments, labels, issues, PRs, etc.). | Our case: PR with Sonar fixes; optional “address review” workflow. |

**Summary:**

- **Agents tab:** Best for **task-based, human-initiated** work: “Fix this,” “Add tests here,” “Address review comments on this PR.” You get a single place to start, monitor, steer, and review. Not automatic on every event unless you add more automation (e.g. Agentic Workflows or custom automation that creates tasks).
- **Agentic Workflows:** **Event/schedule-driven** automation with AI in the loop (markdown-defined). Fits “on every PR” or “every night” without someone clicking “Create task.”
- **Our YAML:** **Event-driven** automation we fully control (Sonar scan → fetch issues → AI fix → PR). No Agents tab required; runs whenever the trigger fires.

---

## 4. Custom agents and the Agents tab

- **Custom agents** let you define task-specific behavior (system prompts, tools) and use them from the Agents tab (or other entry points).
- They live in the repo (or org/enterprise); you pick one when creating a task (e.g. “Sonar fixer” or “Address PR review comments”).
- So you could define a **custom agent** tuned for “fix Sonar issues” or “address PR review feedback” and then start that work from the **Agents tab** by creating a task and selecting that agent. That’s complementary to (not a replacement for) our **automatic** Sonar and “address review” workflows.

---

## 5. Enterprise: Agent control plane (Feb 2026)

For enterprises, GitHub has **Enterprise AI Controls** and an **agent control plane** (GA Feb 2026):

- Audit visibility into agent activity.
- Org/enterprise-wide custom agent policies.
- **MCP allowlist** management.
- Fine-grained permissions for AI admins.

This applies to how Copilot and coding agents (and thus the Agents tab) are governed at scale; it doesn’t change the fact that the Agents tab is the UI for **coding agent sessions**, while **Agentic Workflows** and our **YAML** are other automation layers.

---

## 6. How this relates to our project (Sonar fixer + agentic PR review)

- **Today we use:** Manual YAML workflows (e.g. `sonar-ai-fix.yml`) that run on `pull_request` / `push`, call our script + Claude, and open a PR. No Agents tab required.
- **Agents tab can add:** A **human-driven** path: e.g. “From the Agents tab I create a task: ‘Address all unresolved review comments on PR #42’ and choose our custom agent.” The coding agent then works in its session and opens (or updates) a PR; we monitor and steer from the Agents tab and review/merge as usual.
- **Agentic Workflows could add:** Event-driven automation (e.g. on `pull_request_review` or `issue_comment`) with AI defined in markdown instead of our YAML + script. Still automatic; different authoring model.
- **Best of both:** Keep **automatic** Sonar fix and “address review” in YAML (or migrate to Agentic Workflows later). Use the **Agents tab** when we want to **ad-hoc** start a coding agent task (e.g. “fix Sonar on main” or “address feedback on this PR”) with a custom agent and full visibility/steering.

So: **Yes, the new GitHub Agents tab was researched.** It’s the repo-level UI for the **Copilot coding agent** (and custom/third-party agents). It’s ideal for **task-based, human-initiated** agent work and for **reviewing/steering** agent sessions and their PRs; it’s separate from **Agentic Workflows** (event/schedule-driven, markdown-defined) and from our **manual YAML** (event-driven, fully custom). All three can coexist: YAML (or gh-aw) for “when X happens, do Y”; Agents tab for “I want the agent to do Z right now” and for monitoring/steering.

---

## 7. Triggering the Copilot agent from Actions / CI/CD

The Copilot coding agent **can** be triggered from a GitHub Action or CI/CD pipeline: (1) **Issue assignment API** — create/update an issue and assign it to Copilot (cloud agent runs and opens a PR); (2) **Copilot SDK** — run the agent runtime inside the workflow job, then push and open a PR yourself. See [COPILOT-AGENT-TRIGGER-FROM-CICD.md](./COPILOT-AGENT-TRIGGER-FROM-CICD.md) for details and examples.

---

## 8. References

- [**Agents on GitHub**](https://github.com/features/copilot/agents) — Official Copilot agents feature page (assign from Issues, CLI, Slack/Teams, mission control, @mention in PRs)
- [Introducing the Agents tab in your repository](https://github.blog/changelog/2026-01-26-introducing-the-agents-tab-in-your-repository) (Changelog)
- [About agent management](https://docs.github.com/en/copilot/concepts/agents/coding-agent/agent-management)
- [Managing coding agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/manage-agents)
- [About GitHub Copilot coding agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent)
- [Enterprise AI Controls & agent control plane GA](https://github.blog/changelog/2026-02-26-enterprise-ai-controls-agent-control-plane-now-generally-available)
- [I Confused Copilot Coding Agent with Agentic Workflows](https://dev.to/hagishun/i-confused-copilot-coding-agent-with-agentic-workflows-turns-out-the-guardrails-are-the-point-38m) (DEV) — coding agent vs Agentic Workflows
- [COPILOT-AGENT-TRIGGER-FROM-CICD.md](./COPILOT-AGENT-TRIGGER-FROM-CICD.md) — triggering the Copilot agent from GitHub Actions / CI/CD (issue assignment API and Copilot SDK)
