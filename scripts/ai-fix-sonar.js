// scripts/ai-fix-sonar.js — Sonar issues → Claude as developer/Sonar fixer, optimised for complex issues
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CONTEXT_LINES = parseInt(process.env.CONTEXT_LINES || '12', 10) || 12;
// Rules that need larger context for refactors: complexity, size, nesting, duplication, maintainability
const COMPLEXITY_RULES = [
  'S3776',   // cognitive complexity
  'S138',    // too many lines
  'S1541',   // method too complex
  'S1067',   // expression too complex
  'S107',    // too many parameters
  'S104',    // too many lines in file
  'S1656',   // nested control flow
  'S1192',   // duplicate string literal (may need file-wide constant)
  'S1479',   // switch with too many cases
  'S134',    // nested control flow depth
  'cognitive',
  'complexity',
  'refactor',
  'extract',
  'duplicate',
  'nesting',
  'too many',
  'too long',
  'maintainability',
];

function isComplexityRule(rule) {
  const r = (rule || '').toLowerCase();
  return COMPLEXITY_RULES.some((k) => r.includes(k.toLowerCase()));
}

async function fixSonarIssues() {
  const issues = JSON.parse(
    await fs.readFile('sonar-issues.json', 'utf-8'),
  );

  const fixes = [];

  for (const issue of issues.issues) {
    const filePath = issue.component.split(':')[1];
    if (!filePath) continue;

    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      console.warn('Skip (missing file):', filePath);
      continue;
    }

    const lines = fileContent.split('\n');
    const n = isComplexityRule(issue.rule) ? Math.max(CONTEXT_LINES, 15) : CONTEXT_LINES;
    const zeroBasedLine = Math.max(0, Math.min(issue.line - 1, lines.length - 1));
    const contextStart = Math.max(0, zeroBasedLine - n);
    const contextEnd = Math.min(lines.length, zeroBasedLine + n + 1);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    const ext = path.extname(filePath).slice(1) || 'txt';

    try {
      const message = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `You are an experienced developer and SonarQube fixer. Your job is to fix the reported issue properly, including complex ones: refactor when needed, reduce cognitive complexity, extract helpers, reuse existing constants, and keep the code clean and maintainable.

SonarQube issue:
- Rule: ${issue.rule}
- Message: ${issue.message}
- Severity: ${issue.severity}
- File: ${filePath}
- Line: ${issue.line}

Code context (fix this excerpt):
\`\`\`${ext}
${context}
\`\`\`

Respond with ONLY the fixed code for the context above. No explanations, no markdown outside the code block. Preserve behaviour; keep lint and build passing.`,
          },
        ],
      });

      const fixedCode = message.content[0].text
        .replace(/```[\w]*\n?/g, '')
        .trim();

      fixes.push({
        file: filePath,
        line: issue.line,
        original: context,
        fixed: fixedCode,
        rule: issue.rule,
      });
      console.log('Fix generated:', filePath, issue.rule);
    } catch (err) {
      console.warn('Claude failed for', filePath, issue.rule, err.message);
    }
  }

  await fs.writeFile('ai-fixes.json', JSON.stringify(fixes, null, 2));
  console.log(`Generated ${fixes.length} AI fixes`);
}

fixSonarIssues().catch((err) => {
  console.error(err);
  process.exit(1);
});
