# Triggering GitHub Copilot Coding Agent from GitHub Actions / CI/CD

Yes — the GitHub Copilot coding agent **can** be triggered from a GitHub Action or CI/CD pipeline. There are **two** supported/supported-ish approaches.

**Product context:** [Agents on GitHub](https://github.com/features/copilot/agents) — Copilot (and Claude, Codex, or custom agents) writing PRs, handling edits, @mentions; assign from Issues, CLI, Slack, Teams; mission control in the repo Agents tab.

---

## 1. Trigger the cloud Copilot agent via Issue assignment (official)

The **official** way to start the Copilot coding agent from automation is to **create or update an issue and assign it to Copilot** using the **REST API** or **GraphQL API**. When you assign an issue to Copilot, the **cloud** coding agent picks it up, works in its GitHub Actions–backed environment, and opens a PR.

### How it works

1. Your workflow runs (e.g. on schedule, or on `workflow_dispatch`, or after another job).
2. The workflow calls the GitHub API to either:
   - **Create a new issue** with Copilot as assignee, or
   - **Add Copilot as assignee** to an existing issue (or **update** an issue with assignees).
3. You can pass **agent assignment options**: target repository, base branch, custom instructions, custom agent, model.
4. Copilot (the service) sees the assignment and starts a session: it works on the issue and opens a PR.

So the **trigger** from CI/CD is: “create/update issue + assign to Copilot.” The agent itself runs in GitHub’s infrastructure, not inside your workflow job.

### REST API

- Endpoints: [Create an issue](https://docs.github.com/rest/issues/issues#create-an-issue), [Update an issue](https://docs.github.com/rest/issues/issues#update-an-issue), [Add assignees to an issue](https://docs.github.com/rest/issues/assignees#add-assignees-to-an-issue).
- Optional **agent assignment** parameters (e.g. in request body): `target_repo`, `base_branch`, `custom_instructions`, `custom_agent`, `model` (see [Assigning an issue to Copilot via the GitHub API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue)).

### GraphQL API

- Mutations: `createIssue`, `updateIssue`, `addAssigneesToAssignable`, `replaceActorsForAssignable`.
- You must send the header: `GraphQL-Features: issues_copilot_assignment_api_support` (and optionally `coding_agent_model_selection` for model choice).
- Get Copilot’s actor ID via `repository.suggestedActors(capabilities: [CAN_BE_ASSIGNED])` — the coding agent’s login is `copilot-swe-agent`. Use that node’s `id` as `assigneeIds` (or in `assigneeIds` for addAssigneesToAssignable).
- Optional `agentAssignment` input: `targetRepositoryId`, `baseRef`, `customInstructions`, `customAgent`, `model`.

### Example: GitHub Action that assigns an issue to Copilot

```yaml
# Example: run on schedule or workflow_dispatch, then assign an issue to Copilot
jobs:
  trigger-copilot:
    runs-on: ubuntu-latest
    steps:
      - name: Get repository and Copilot actor IDs
        id: ids
        run: |
          # Get repo node ID and Copilot bot ID via GraphQL (requires token with repo + issues)
          RESP=$(gh api graphql -f query='
            query {
              repository(owner: "${{ github.repository_owner }}", name: "${{ github.event.repository.name }}") {
                id
                suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 10) { nodes { login ... on Bot { id } } }
              }
            }
          ')
          # Parse and export REPO_ID, BOT_ID (copilot-swe-agent)
      - name: Create issue and assign to Copilot
        run: |
          gh api graphql -f query='
            mutation {
              createIssue(input: {
                repositoryId: "${{ steps.ids.outputs.repo_id }}",
                title: "Fix Sonar issues (auto-triggered)",
                body: "Address SonarQube findings from latest scan.",
                assigneeIds: ["${{ steps.ids.outputs.bot_id }}"],
                agentAssignment: {
                  targetRepositoryId: "${{ steps.ids.outputs.repo_id }}",
                  baseRef: "main",
                  customInstructions: "Run in repo; fix only safe issues; open PR."
                }
              }) { issue { id url } }
            }
          ' -H 'GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection'
```

**Authentication:** The token (e.g. `GH_TOKEN` or `GITHUB_TOKEN`) must be able to create/update issues and add assignees. For **assigning to Copilot**, docs say you need a **user token** (e.g. fine-grained PAT with metadata read, and read/write for actions, contents, issues, pull requests). `GITHUB_TOKEN` in Actions may not have the Copilot-assignment capability — use a **PAT or GitHub App user-to-server token** stored as a secret if the default token doesn’t work.

**References:**  
[Assign issues to Copilot using the API (Changelog)](https://github.blog/changelog/2025-12-03-assign-issues-to-copilot-using-the-api)  
[Assigning an issue to Copilot via the GitHub API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/assign-copilot-to-an-issue)

---

## 2. Run Copilot SDK inside the workflow (agent on the runner)

The **GitHub Copilot SDK** (technical preview, Jan 2026) lets you run Copilot’s agent **runtime** inside your own process. You can use it **inside a GitHub Actions job**: install the Copilot CLI and the SDK, authenticate, create a session, and send prompts. The “agent” runs **in your job** (on the runner), not as the cloud Copilot coding agent. You can then commit and push from the same job (e.g. open a PR via CLI or API).

### How it works

1. Job installs Copilot CLI and the SDK (e.g. `@github/copilot-sdk` for Node, or Python/Go/.NET).
2. Authenticate the CLI (e.g. with a PAT that has Copilot access; the SDK uses the CLI).
3. Create a session and send prompts (e.g. “Fix Sonar issues in this repo”); optionally use skills/custom agents.
4. Use the SDK’s tool/output handling to get results, then run `git` + `gh` (or API) to push and open a PR.

So you’re **not** “triggering the cloud agent” — you’re **embedding** agent behavior in your pipeline. Good when you want the logic to run entirely in your workflow and under your control.

### Constraints

- **Technical preview** — behavior and APIs may change.
- **Auth:** Runner must have Copilot CLI authenticated (e.g. PAT with Copilot permissions); store as secret.
- **Runner:** Needs Node (or Python/Go/.NET), Copilot CLI, and enough resources for the agent run.

**References:**  
[Getting started with Copilot SDK](https://docs.github.com/en/copilot/how-tos/copilot-sdk/sdk-getting-started)  
[Running GitHub Copilot SDK Inside GitHub Actions](https://thomasthornton.cloud/running-github-copilot-sdk-inside-github-actions/)  
[Building Agents with GitHub Copilot SDK (Microsoft Community)](https://techcommunity.microsoft.com/blog/azuredevcommunityblog/building-agents-with-github-copilot-sdk-a-practical-guide-to-automated-tech-upda/4488948)

---

## Summary

| Goal | Approach | Trigger from Actions/CI |
|------|----------|-------------------------|
| **Start the cloud Copilot coding agent** (it runs on GitHub’s side and opens a PR) | **Issue assignment API** | Yes: workflow calls REST/GraphQL to create or update an issue and assign it to Copilot (`copilot-swe-agent`), with optional `agentAssignment` (repo, base branch, instructions, custom agent, model). Use a user token (PAT or App) if required. |
| **Run agent logic inside the pipeline** (on the runner, then push/PR yourself) | **Copilot SDK** in the job | Yes: install CLI + SDK in the job, authenticate, create session, send prompts; then use git/gh to push and open a PR. |

So: **yes, the GitHub Copilot agent can be triggered from a GitHub Action or CI/CD** — either by **assigning an issue to Copilot via API** (cloud agent) or by **running the Copilot SDK inside the workflow** (agent on the runner).

---

## Jenkins example

A full **Jenkins** example (Jenkinsfile + shell scripts using `gh` or `curl`) is in **[docs/examples/jenkins/](./examples/jenkins/)**:

- **Jenkinsfile** — Pipeline with parameters (e.g. `GITHUB_OWNER`, `GITHUB_REPO`, `ISSUE_TITLE`) and a stage that runs `trigger-copilot-gh.sh`.
- **trigger-copilot-gh.sh** — Uses `gh api graphql` to get repo + Copilot bot ID, then creates an issue and assigns it to Copilot (requires `gh` and `jq` on the agent).
- **trigger-copilot-curl.sh** — Same flow using only `curl` and `jq` (no `gh`).

Use a **Jenkins repo** (e.g. `myorg/jenkins-pipelines`) with Pipeline from SCM pointing at a repo that contains these files; add credential `github-copilot-token` (GitHub PAT with repo + issues, user with Copilot). Run the job to create an issue and assign it to Copilot; Copilot will open a PR in the target repo.
