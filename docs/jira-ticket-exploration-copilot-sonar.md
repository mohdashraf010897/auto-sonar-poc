# Jira ticket: Exploration – SonarQube + GitHub Copilot Agent (Agents on GitHub) POC

Use this when creating the ticket in Jira (e.g. Story or Task in your current sprint).  
If your Jira supports it, use the **Description** in Jira wiki markup; otherwise paste the plain-English version.

---

## Summary (title)

**Exploration: SonarQube issues → GitHub Copilot Agent POC – track progress and next steps**

---

## Description (Jira wiki markup)

If your Jira uses Atlassian wiki markup, you can use the following. Otherwise skip to *Plain description* below.

```
h2. Context
Exploring use of *GitHub Copilot (Agents on GitHub)* to auto-fix SonarQube issues on contributor PRs instead of (or in addition to) our in-repo Claude-based workflow.

h2. What we did (current sprint)

* *Contributor PR → Sonar → fix PR flow (in-repo):*
** Workflow {{sonar-ai-fix.yml}} runs on PR/push, runs Sonar, fetches issues, uses Claude ({{ai-fix-sonar.js}}) to generate fixes, applies them, and creates a fix PR. On {{pull_request}} the fix PR targets the *contributor's branch* so they can merge it into their PR.
** Doc: contributor flow and fix-PR targeting described in {{CONTRIBUTOR-PR-SONAR-AGENT-FIX.md}} and {{IMPLEMENTATION-STEPS.md}}.

* *POC – Copilot Agent path:*
** Added workflow {{sonar-copilot-agent-poc.yml}}: on PR (or manual run), runs Sonar, fetches issue count; if issues > 0, creates a GitHub *issue* and *assigns it to Copilot* via the Issue Assignment API (GraphQL), with {{baseRef}} = PR head branch so Copilot is asked to fix on the contributor's branch.
** Script {{scripts/trigger-copilot-via-issue.js}}: gets repo + Copilot bot ID, then {{createIssue}} with {{agentAssignment}} (target repo, baseRef, custom instructions). Uses secret {{COPILOT_ASSIGNMENT_TOKEN}} (user PAT with repo + issues; user must have Copilot).
** Doc: {{POC-COPILOT-AGENT-SONAR.md}} – setup (enable Copilot for repo, add token secret, Sonar secrets), how to run, what to expect (issue created, Agents tab, Copilot opens fix PR).

* *Research and examples already in repo:*
** Agentic PR review (listen to reviewer comments, validate, tweak): {{AGENTIC-PR-REVIEW-RESEARCH.md}}, test-driven plan, efficient-at-scale approach, autonomous agents vs workflows, GitHub Agents tab, triggering Copilot from CI/Jenkins (including Jenkins example in {{docs/examples/jenkins/}}).

h2. What we're aiming next

* *Run the Copilot POC end-to-end:* Add {{COPILOT_ASSIGNMENT_TOKEN}} (and ensure Copilot coding agent is enabled for the repo), open a PR that triggers Sonar issues, confirm the workflow creates an issue and assigns to Copilot, then track in the *Agents* tab and verify Copilot opens a fix PR.
* *Decide path:* After POC, choose whether to standardise on (a) in-repo Sonar AI fix only, (b) Copilot-agent path only, or (c) both (e.g. Copilot for teams with licence, in-repo for others).
* *Optional follow-up:* Implement agentic “address PR review comments” (workflow + script that reacts to reviewer comments, classifies, applies fixes, replies) using the research we already documented.
```

---

## Plain description (copy-paste if Jira doesn’t use markup)

**Context**  
Exploring use of **GitHub Copilot (Agents on GitHub)** to auto-fix SonarQube issues on contributor PRs, alongside (or instead of) an in-repo flow that uses Claude (Anthropic API). Goal: contributor opens a PR → Sonar reports issues → an agent raises a fix PR so the contributor can merge fixes without manual cleanup. **Repo:** https://github.com/mohdashraf010897/auto-sonar-poc

**What we did (current sprint)**  
- **Contributor PR → Sonar → fix PR flow (in-repo):** Workflow `sonar-ai-fix.yml` runs on PR/push, runs Sonar, fetches issues, uses Claude (`ai-fix-sonar.js`) to generate fixes, applies them, and creates a fix PR. On `pull_request` the fix PR targets the contributor’s branch so they can merge it into their PR. First phase (Claude + GH Action) is done; fix PR created and validated. See repo and workflow links below.  
- **POC – Copilot Agent path:** Added workflow `sonar-copilot-agent-poc.yml`: on PR (or manual run), runs Sonar, fetches issue count; if issues > 0, creates a GitHub issue and assigns it to Copilot via the Issue Assignment API (GraphQL), with `baseRef` = PR head branch. Script `scripts/trigger-copilot-via-issue.js` gets repo + Copilot bot ID, then `createIssue` with `agentAssignment`. Uses secret `COPILOT_ASSIGNMENT_TOKEN` (user PAT; user must have Copilot). POC workflow and script in repo; next step is to run end-to-end.  
- **Research and examples:** Agentic PR review, test-driven plan, efficient-at-scale approach, autonomous agents vs workflows, GitHub Agents tab, triggering Copilot from CI/Jenkins (Jenkins example in `docs/examples/jenkins/`).

**What we’re aiming next**  
- Run the Copilot POC end-to-end: add `COPILOT_ASSIGNMENT_TOKEN`, enable Copilot for the repo, open a PR that triggers Sonar issues, confirm issue creation and assignment to Copilot, track in the Agents tab, verify Copilot opens a fix PR.  
- Decide path: after POC, choose in-repo only vs Copilot-agent only vs both.  
- Optional: implement “address PR review comments” (workflow + script from existing research).

**Reference links**  
- Repo: https://github.com/mohdashraf010897/auto-sonar-poc  
- Workflow (Claude fix): https://github.com/mohdashraf010897/auto-sonar-poc/blob/main/.github/workflows/sonar-ai-fix.yml  

---

## Suggested Jira fields (if your project uses them)

| Field   | Suggested value |
|--------|------------------|
| Type   | Story or Task    |
| Summary | As in *Summary* above |
| Description | Wiki markup or plain description above |
| Sprint | Your current sprint |
| Labels | e.g. `exploration`, `poc`, `github-copilot`, `sonarqube` (if available) |

---

*Note: The Jira MCP server returned "fetch failed" from this environment (likely network/VPN or auth to corp Jira). You can create this ticket manually in Jira, or retry the MCP once your Jira is reachable.*
