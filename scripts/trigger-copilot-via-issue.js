#!/usr/bin/env node
/**
 * POC: Create a GitHub issue and assign it to Copilot (Agents on GitHub) so the
 * coding agent fixes SonarQube issues. Uses GraphQL with Issue Assignment API.
 *
 * Required env:
 *   COPILOT_ASSIGNMENT_TOKEN  — GitHub PAT (repo + issues; user must have Copilot)
 *   GITHUB_REPOSITORY         — owner/repo (or GITHUB_OWNER + GITHUB_REPO)
 *
 * Optional (for Sonar POC):
 *   PR_NUMBER, PR_HEAD_REF, PR_HTML_URL, SONAR_ISSUE_COUNT, ISSUE_TITLE, ISSUE_BODY, BASE_REF
 */
const API = 'https://api.github.com/graphql';
const FEATURES = 'issues_copilot_assignment_api_support,coding_agent_model_selection';

const token = process.env.COPILOT_ASSIGNMENT_TOKEN || process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPOSITORY || '';
const [owner, repoName] = repo.split('/');
const prNumber = process.env.PR_NUMBER || '';
const prHeadRef = process.env.PR_HEAD_REF || process.env.BASE_REF || 'main';
const prHtmlUrl = process.env.PR_HTML_URL || '';
const sonarCount = process.env.SONAR_ISSUE_COUNT || '0';
const issueTitle =
  process.env.ISSUE_TITLE ||
  (prNumber
    ? `Fix SonarQube issues on PR #${prNumber} (POC)`
    : 'Fix SonarQube issues (POC)');
const issueBody =
  process.env.ISSUE_BODY ||
  [
    prNumber && `**Target PR:** [#${prNumber}](${prHtmlUrl})`,
    prHeadRef && `**Branch to fix:** \`${prHeadRef}\`. Please branch from this ref and open a PR that targets \`${prHeadRef}\` so the contributor can merge the fix into their PR.`,
    `**Context:** ${sonarCount} SonarQube issue(s) were reported. Fix them and open a single PR.`,
    'Run in this repo; keep build and lint passing.',
  ]
    .filter(Boolean)
    .join('\n\n');
const baseRef = process.env.BASE_REF || prHeadRef || 'main';
const customInstructions =
  process.env.CUSTOM_INSTRUCTIONS ||
  `Fix the SonarQube issues reported. Branch from ${baseRef}. Open one PR when done. Preserve behavior; keep build and lint passing.`;

if (!token) {
  console.error('Set COPILOT_ASSIGNMENT_TOKEN (or GITHUB_TOKEN) with repo + issues; user must have Copilot.');
  process.exit(1);
}
if (!owner || !repoName) {
  console.error('Set GITHUB_REPOSITORY to owner/repo (or GITHUB_OWNER and GITHUB_REPO).');
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'GraphQL-Features': FEATURES,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await res.json();
  if (data.errors) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data.data;
}

async function main() {
  console.log('Fetching repository and Copilot actor IDs...');
  const idQuery = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 20) {
          nodes { login ... on Bot { id } }
        }
      }
    }
  `;
  const idData = await graphql(idQuery, { owner, repo: repoName });
  const repoId = idData?.repository?.id;
  const bot = idData?.repository?.suggestedActors?.nodes?.find((n) => n.login === 'copilot-swe-agent');
  const botId = bot?.id;

  if (!repoId) {
    console.error('Could not get repository ID for', owner + '/' + repoName);
    process.exit(1);
  }
  if (!botId) {
    console.error('Copilot (copilot-swe-agent) not in suggestedActors. Enable Copilot coding agent for this repo.');
    process.exit(1);
  }

  console.log('Creating issue and assigning to Copilot...');
  const mutation = `
    mutation($repoId: ID!, $botId: [ID!]!, $title: String!, $body: String!, $baseRef: String!, $customInstructions: String!) {
      createIssue(input: {
        repositoryId: $repoId,
        title: $title,
        body: $body,
        assigneeIds: $botId,
        agentAssignment: {
          targetRepositoryId: $repoId,
          baseRef: $baseRef,
          customInstructions: $customInstructions
        }
      }) {
        issue { id url title }
      }
    }
  `;
  const result = await graphql(mutation, {
    repoId,
    botId: [botId],
    title: issueTitle,
    body: issueBody,
    baseRef,
    customInstructions,
  });

  const issue = result?.createIssue?.issue;
  if (!issue) {
    console.error('Failed to create issue:', result);
    process.exit(1);
  }
  console.log('Created issue and assigned to Copilot:', issue.url);
  console.log('Copilot will work on it. Track in the repo Agents tab or PRs.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
