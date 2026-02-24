# Sonar codemods (rule-specific fixes)

Applies fixes for a fixed set of Sonar rules. Used by the **Sonar issues report PR** workflow.

## Supported rules

| Rule | Fix |
|------|-----|
| S1481 (unused variable) | Remove the variable declaration statement |
| S2228 / S106 (console) | Remove the `console.*` statement |

## Usage

```bash
# From repo root; issues JSON path as arg or env
pnpm run fixer
# or
node scripts/sonar-fixer/run.cjs /path/to/issues.json
```

The workflow passes `/tmp/issues.json` (from SonarCloud API). For local testing, use the sample:

```bash
node scripts/sonar-fixer/run.cjs scripts/sonar-fixer/issues-sample.json
```

## Adding more rules

1. Add the rule key to `FIXABLE_RULES` in `run.cjs`.
2. In `transform.cjs`, add logic to find and remove (or replace) the node at the given line for that rule.
3. Optionally add a test case to `issues-sample.json` and run the fixer.

LLM-assisted fixes are planned later; see `cursor_outputs/SONAR-FIXER-DESIGN.md`.
