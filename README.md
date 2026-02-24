# Auto Sonar

React + TypeScript todo app (Vite), with SonarCloud analysis and GitHub Actions.

## Setup

Uses [pnpm](https://pnpm.io). Install with `corepack enable && corepack prepare pnpm@latest --activate` or `npm i -g pnpm`.

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

- `pnpm run dev` – dev server
- `pnpm run build` – production build
- `pnpm run preview` – preview production build
- `pnpm run lint` – ESLint
- `pnpm run ci` – same as CI (install, build, lint). Run before pushing.

## Run the GitHub workflow locally

- **Same commands, no runner:**  
  `pnpm run ci` — runs install + build + lint (Sonar step is skipped without `SONAR_TOKEN`).

- **Same workflow in a container (like CI):**  
  [act](https://github.com/nektos/act) runs the Build workflow in Docker. **Docker must be running** (e.g. Docker Desktop).

  ```bash
  pnpm run act
  ```

  First run may pull the runner image (~500MB). To run Sonar locally: `npm run act -- -s SONAR_TOKEN=your_token`.

## SonarCloud

The **Build** workflow runs on push/PR to `main`: install → build → lint → SonarCloud scan.

After each successful Build on `main`, the **Sonar issues report PR** workflow fetches open issues from SonarCloud and opens or updates a PR (branch `bot/sonar-issues-report`) with the issue list in the description only—no file changes.

1. In [SonarCloud](https://sonarcloud.io), connect this repo and disable Automatic Analysis (use CI).
2. Add **SONAR_TOKEN** to repo **Settings → Secrets and variables → Actions**.
3. Optionally set **SONAR_ORGANIZATION** and **SONAR_PROJECT_KEY** if your project key differs from `owner_repo`.

## Reference docs

Previous Sonar/fixer POC docs and reports are in `cursor_outputs/`.
