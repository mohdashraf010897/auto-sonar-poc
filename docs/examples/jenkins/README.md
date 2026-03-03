# Triggering GitHub Copilot Agent from Jenkins

This folder shows how to trigger the **GitHub Copilot coding agent** from a **Jenkins** pipeline (or any Jenkins job), using the **Issue Assignment API**. The agent runs in the cloud and opens a PR; Jenkins only creates an issue and assigns it to Copilot.

**Product:** [Agents on GitHub](https://github.com/features/copilot/agents) — assign Copilot (or Claude/Codex/custom agents) from Issues, CLI, Slack, Teams; manage tasks in the repo **Agents** tab.

## Prerequisites

- Jenkins with network access to `api.github.com`
- **GitHub token** with:
  - Repo scope (or fine-grained: **Metadata** read, **Contents** and **Issues** read + write, **Pull requests** read + write)
  - **Copilot** access (user must have Copilot; token used for API must be able to assign issues to Copilot)
- **GitHub CLI (`gh`)** installed on the Jenkins agent (optional; you can use `curl` only — see `trigger-copilot-curl.sh`)

## Files

| File | Description |
|------|-------------|
| `Jenkinsfile` | Declarative pipeline: one stage that triggers Copilot by creating an issue and assigning it. Uses `gh` CLI. |
| `trigger-copilot-gh.sh` | Shell script using `gh api graphql` to get repo + Copilot bot ID, then create issue and assign to Copilot. Run from Jenkins or any CI. |
| `trigger-copilot-curl.sh` | Same flow using only `curl` (no `gh`). Use when `gh` is not installed on the agent. |

## Jenkins setup

1. **Add GitHub token to Jenkins**
   - **Credentials** → Add **Secret text**
   - ID: e.g. `github-copilot-token`
   - Secret: your GitHub PAT (classic with `repo` or fine-grained with issues + contents + PRs; user must have Copilot)

2. **Use the pipeline**
   - **New Item** → **Pipeline**
   - **Pipeline** → Definition: **Pipeline script from SCM** and point to this repo, or paste the contents of `Jenkinsfile` as **Pipeline script**.
   - In the Jenkinsfile, set `GITHUB_OWNER` and `GITHUB_REPO` (or use parameters) to your repo (e.g. your org’s Jenkins repo or the repo you want Copilot to work on).

3. **Run**
   - Run the job (e.g. manually or on a schedule). It will create an issue in the target repo, assign it to Copilot, and Copilot will start working and open a PR.

**If your Jenkins repo has a flat layout** (e.g. Jenkinsfile and scripts at repo root), change the pipeline stage to run `./trigger-copilot-gh.sh` from the workspace root and remove the `dir('docs/examples/jenkins') { ... }` wrapper.

## Example: “Jenkins repo” (e.g. `myorg/jenkins-pipelines`)

- **Repo:** `myorg/jenkins-pipelines` (the repo where this Jenkinsfile lives, or any repo you want Copilot to work on).
- **Goal:** When the pipeline runs (e.g. “Trigger Copilot” button or nightly), create an issue like “Fix Sonar issues (triggered from Jenkins)” and assign it to Copilot so it opens a PR in that repo.
- **Result:** Copilot (cloud) picks up the issue, works in its environment, and opens a PR; you review and merge from GitHub.

## Parameters (Jenkinsfile)

You can add Jenkins **parameters** and pass them into the script:

- `GITHUB_OWNER` — e.g. `myorg`
- `GITHUB_REPO` — e.g. `jenkins-pipelines` or `jenkins`
- `ISSUE_TITLE` — e.g. `Fix Sonar issues (Jenkins trigger)`
- `ISSUE_BODY` — Description for Copilot
- `CUSTOM_INSTRUCTIONS` — Optional extra instructions for the agent (base branch, scope, etc.)

All of these can be defaulted in the Jenkinsfile so a “Jenkins repo” can trigger Copilot with one click.
