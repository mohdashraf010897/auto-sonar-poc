// scripts/ai-fix-sonar.js — Markaicode article: send Sonar issues to Claude, write ai-fixes.json
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    const contextStart = Math.max(0, issue.line - 5);
    const contextEnd = Math.min(lines.length, issue.line + 5);
    const context = lines.slice(contextStart, contextEnd).join('\n');

    const ext = path.extname(filePath).slice(1) || 'txt';

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Fix this SonarQube issue:

Rule: ${issue.rule}
Message: ${issue.message}
Severity: ${issue.severity}
File: ${filePath}
Line: ${issue.line}

Context:
\`\`\`${ext}
${context}
\`\`\`

Instructions:
- Prefer reusing existing constants, variables, or imports already in the file; do not add new declarations unless they are actually used.
- Keep the change minimal so the code still passes lint and build (no unused variables or dead code).
- Provide ONLY the fixed code for the context shown above. No explanations.`,
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
