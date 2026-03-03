#!/usr/bin/env bash
# Trigger GitHub Copilot coding agent by creating an issue and assigning it to Copilot.
# Uses GitHub CLI (gh). Run from Jenkins or any CI with GITHUB_TOKEN and repo set.
#
# Required env:
#   GITHUB_TOKEN  - GitHub PAT (repo + issues; user must have Copilot)
#   GITHUB_OWNER  - e.g. jenkinsci or myorg
#   GITHUB_REPO   - e.g. jenkins or my-jenkins-pipelines
#
# Optional env:
#   ISSUE_TITLE   - default: "Fix Sonar issues (triggered from Jenkins)"
#   ISSUE_BODY    - default: "Address SonarQube/code quality findings. Open a PR when done."
#   CUSTOM_INSTRUCTIONS - extra instructions for Copilot (base branch, scope, etc.)
#   BASE_REF      - default: main

set -e

OWNER="${GITHUB_OWNER:?Set GITHUB_OWNER}"
REPO="${GITHUB_REPO:?Set GITHUB_REPO}"
TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN}"
TITLE="${ISSUE_TITLE:-Fix Sonar issues (triggered from Jenkins)}"
BODY="${ISSUE_BODY:-Address SonarQube/code quality findings. Open a PR when done.}"
INSTRUCTIONS="${CUSTOM_INSTRUCTIONS:-Run in this repo; fix safe issues only; open a single PR.}"
BASE_REF="${BASE_REF:-main}"

export GH_TOKEN="$GITHUB_TOKEN"

# 1) Get repository node ID and Copilot bot node ID
echo "Fetching repository and Copilot actor IDs..."
QUERY_ID='query {
  repository(owner: "'"$OWNER"'", name: "'"$REPO"'") {
    id
    suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 20) {
      nodes {
        login
        ... on Bot { id }
      }
    }
  }
}'

RESP=$(gh api graphql -f query="$QUERY_ID")
REPO_ID=$(echo "$RESP" | jq -r '.data.repository.id')
BOT_ID=$(echo "$RESP" | jq -r '.data.repository.suggestedActors.nodes[] | select(.login == "copilot-swe-agent") | .id')

if [ -z "$REPO_ID" ] || [ "$REPO_ID" = "null" ]; then
  echo "ERROR: Could not get repository ID for $OWNER/$REPO"
  exit 1
fi
if [ -z "$BOT_ID" ] || [ "$BOT_ID" = "null" ]; then
  echo "ERROR: Copilot (copilot-swe-agent) not in suggestedActors. Enable Copilot coding agent for this repo."
  exit 1
fi

# Escape for JSON (body and instructions)
BODY_ESC=$(echo "$BODY" | jq -Rs .)
INSTRUCTIONS_ESC=$(echo "$INSTRUCTIONS" | jq -Rs .)

# 2) Create issue and assign to Copilot with agentAssignment
echo "Creating issue and assigning to Copilot..."
MUTATION='mutation {
  createIssue(input: {
    repositoryId: "'"$REPO_ID"'",
    title: '"$(echo "$TITLE" | jq -Rs .)"',
    body: '"$BODY_ESC"',
    assigneeIds: ["'"$BOT_ID"'"],
    agentAssignment: {
      targetRepositoryId: "'"$REPO_ID"'",
      baseRef: "'"$BASE_REF"'",
      customInstructions: '"$INSTRUCTIONS_ESC"'
    }
  }) {
    issue { id url title }
  }
}'

RESULT=$(gh api graphql \
  -f query="$MUTATION" \
  -H 'GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection')

ISSUE_URL=$(echo "$RESULT" | jq -r '.data.createIssue.issue.url')
echo "Created issue and assigned to Copilot: $ISSUE_URL"
echo "Copilot will work on it and open a PR. Check the Agents tab or the repo PRs."
