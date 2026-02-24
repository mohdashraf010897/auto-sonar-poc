# Auto Sonar

React + TypeScript todo app (Vite), with SonarCloud analysis and GitHub Actions.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

- `npm run dev` – dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run lint` – ESLint
- `npm run ci` – same as CI (install, build, lint). Run before pushing.

## Run the GitHub workflow locally

- **Same commands, no runner:**  
  `npm run ci` — runs install + build + lint (Sonar step is skipped without `SONAR_TOKEN`).

- **Same workflow in a container (like CI):**  
  [act](https://github.com/nektos/act) runs the Build workflow in Docker. **Docker must be running** (e.g. Docker Desktop).

  ```bash
  npm run act
  ```

  First run may pull the runner image (~500MB). To run Sonar locally: `npm run act -- -s SONAR_TOKEN=your_token`.

## SonarCloud

The **Build** workflow runs on push/PR to `main`: install → build → lint → SonarCloud scan.

1. In [SonarCloud](https://sonarcloud.io), connect this repo and disable Automatic Analysis (use CI).
2. Add **SONAR_TOKEN** to repo **Settings → Secrets and variables → Actions**.
3. Optionally set **SONAR_ORGANIZATION** and **SONAR_PROJECT_KEY** if your project key differs from `owner_repo`.

## Reference docs

Previous Sonar/fixer POC docs and reports are in `cursor_outputs/`.
