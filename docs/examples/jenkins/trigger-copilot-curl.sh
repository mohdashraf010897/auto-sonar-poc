#!/usr/bin/env bash
# Trigger GitHub Copilot coding agent by creating an issue and assigning it to Copilot.
# Uses only curl and jq (no gh CLI). Run from Jenkins or any CI.
#
# Required env:
#   GITHUB_TOKEN  - GitHub PAT (repo + issues; user must have Copilot)
#   GITHUB_OWNER  - e.g. jenkinsci or myorg
#   GITHUB_REPO   - e.g. jenkins or my-jenkins-pipelines
#
# Optional: ISSUE_TITLE, ISSUE_BODY, CUSTOM_INSTRUCTIONS, BASE_REF (see trigger-copilot-gh.sh)

set -e

OWNER="${GITHUB_OWNER:?Set GITHUB_OWNER}"
REPO="${GITHUB_REPO:?Set GITHUB_REPO}"
TOKEN="${GITHUB_TOKEN:?Set GITHUB_TOKEN}"
TITLE="${ISSUE_TITLE:-Fix Sonar issues (triggered from Jenkins)}"
BODY="${ISSUE_BODY:-Address SonarQube/code quality findings. Open a PR when done.}"
INSTRUCTIONS="${CUSTOM_INSTRUCTIONS:-Run in this repo; fix safe issues only; open a single PR.}"
BASE_REF="${BASE_REF:-main}"

API="https://api.github.com/graphql"
HEADER_AUTH="Authorization: bearer $TOKEN"
HEADER_FEATURES="GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection"

# 1) Get repository node ID and Copilot bot node ID
echo "Fetching repository and Copilot actor IDs..."
QUERY_ID='{"query":"query { repository(owner: \"'"$OWNER"'\", name: \"'"$REPO"'\") { id suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 20) { nodes { login ... on Bot { id } } } } }"}'

RESP=$(curl -s -X POST "$API" \
  -H "$HEADER_AUTH" \
  -H "$HEADER_FEATURES" \
  -H "Content-Type: application/json" \
  -d "$QUERY_ID")

REPO_ID=$(echo "$RESP" | jq -r '.data.repository.id')
BOT_ID=$(echo "$RESP" | jq -r '.data.repository.suggestedActors.nodes[] | select(.login == "copilot-swe-agent") | .id')

if [ -z "$REPO_ID" ] || [ "$REPO_ID" = "null" ]; then
  echo "ERROR: Could not get repository ID for $OWNER/$REPO"
  echo "$RESP" | jq .
  exit 1
fi
if [ -z "$BOT_ID" ] || [ "$BOT_ID" = "null" ]; then
  echo "ERROR: Copilot (copilot-swe-agent) not in suggestedActors. Enable Copilot coding agent for this repo."
  exit 1
fi

# 2) Build createIssue mutation with variables (jq escapes strings for JSON)
MUTATION=$(jq -n \
  --arg repoId "$REPO_ID" \
  --arg botId "$BOT_ID" \
  --arg baseRef "$BASE_REF" \
  --arg title "$TITLE" \
  --arg body "$BODY" \
  --arg customInstructions "$INSTRUCTIONS" \
  '{
    query: "mutation($repoId: ID!, $botId: [ID!]!, $baseRef: String!, $title: String!, $body: String!, $customInstructions: String!) { createIssue(input: { repositoryId: $repoId, title: $title, body: $body, assigneeIds: $botId, agentAssignment: { targetRepositoryId: $repoId, baseRef: $baseRef, customInstructions: $customInstructions } }) { issue { id url title } } }",
    variables: {
      repoId: $repoId,
      botId: [$botId],
      baseRef: $baseRef,
      title: $title,
      body: $body,
      customInstructions: $customInstructions
    }
  }')

echo "Creating issue and assigning to Copilot..."
RESULT=$(curl -s -X POST "$API" \
  -H "$HEADER_AUTH" \
  -H "$HEADER_FEATURES" \
  -H "Content-Type: application/json" \
  -d "$MUTATION")

if echo "$RESULT" | jq -e '.errors' > /dev/null 2>&1; then
  echo "ERROR: GraphQL errors:"
  echo "$RESULT" | jq '.errors'
  exit 1
fi

ISSUE_URL=$(echo "$RESULT" | jq -r '.data.createIssue.issue.url')
echo "Created issue and assigned to Copilot: $ISSUE_URL"
echo "Copilot will work on it and open a PR. Check the Agents tab or the repo PRs."
