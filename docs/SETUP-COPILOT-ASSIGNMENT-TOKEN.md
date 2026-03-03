# Setup: COPILOT_ASSIGNMENT_TOKEN

Step-by-step guide to create a GitHub Personal Access Token (PAT) and add it as a repository secret so the POC workflow can assign issues to the Copilot coding agent.

**Requirement:** The GitHub account that creates the token must have **Copilot** (and ideally [Agents on GitHub](https://github.com/features/copilot/agents)) so the Issue Assignment API accepts the token for assigning to Copilot.

---

## Part 1: Create the token

### Option A — Fine-grained PAT (recommended, least privilege)

1. **Open token creation**
   - GitHub (top-right) → **Settings**
   - Left sidebar → **Developer settings**
   - **Personal access tokens** → **Fine-grained tokens** (or go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta))

2. **Create a new token**
   - Click **Generate new token**
   - **Token name:** e.g. `auto-sonar-poc-copilot-assignment`
   - **Expiration:** choose 90 days, 1 year, or no expiration (your policy)
   - **Resource owner:** your user (or the org that owns the repo)
   - **Repository access:** choose **Only select repositories** and pick the repo (e.g. `mohdashraf010897/auto-sonar-poc`)

3. **Permissions**
   - **Repository permissions:**
     - **Metadata:** Read-only
     - **Contents:** Read-only
     - **Issues:** Read and write
     - **Pull requests:** Read and write
   - Leave everything else to **No access** unless you need more for other automation.

4. **Generate**
   - Click **Generate token**
   - **Copy the token immediately** (you won’t see it again). This value is your `COPILOT_ASSIGNMENT_TOKEN`.

---

### Option B — Classic PAT

1. **Open token creation**
   - GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**  
   - Or: [github.com/settings/tokens](https://github.com/settings/tokens)
   - Click **Generate new token (classic)**

2. **Configure**
   - **Note:** e.g. `auto-sonar-poc Copilot assignment`
   - **Expiration:** as above
   - **Scopes:** check **repo** (full control of private repositories). That includes repo + issues + PRs. For public-only repos you can use a narrower scope if your account has that option.

3. **Generate**
   - Click **Generate token**
   - Copy the token; this is your `COPILOT_ASSIGNMENT_TOKEN`.

---

## Part 2: Add the token as a repository secret

1. **Open the repo**
   - Go to the repo (e.g. `https://github.com/mohdashraf010897/auto-sonar-poc`).

2. **Secrets**
   - **Settings** → **Secrets and variables** → **Actions**

3. **New secret**
   - Click **New repository secret**
   - **Name:** `COPILOT_ASSIGNMENT_TOKEN` (exactly this; the workflow expects this name)
   - **Value:** paste the token you copied in Part 1
   - Click **Add secret**

---

## Verify

1. **Secrets list**  
   Under **Settings** → **Secrets and variables** → **Actions** you should see **COPILOT_ASSIGNMENT_TOKEN** (value is hidden).

2. **Run the POC**  
   - Open a PR that has Sonar issues, or  
   - **Actions** → **POC — Sonar → Copilot Agent** → **Run workflow**  
   The **Assign to Copilot** step should run and create an issue assigned to Copilot. If you get a permission or “cannot assign” error, the token may not have the right scopes or the account may not have Copilot; double-check Part 1 and use a user that has Copilot.

---

## Quick reference

| Step | What to do |
|------|------------|
| 1 | GitHub → Settings → Developer settings → Personal access tokens |
| 2 | Create fine-grained (or classic) token; repo access + **Issues** and **Pull requests** read/write (and **Contents** read for fine-grained) |
| 3 | Copy the token |
| 4 | Repo → Settings → Secrets and variables → Actions → New repository secret |
| 5 | Name: `COPILOT_ASSIGNMENT_TOKEN`, Value: paste token → Add secret |
