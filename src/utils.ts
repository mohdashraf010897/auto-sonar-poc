/**
 * Intentionally added for SonarCloud demo: unused variable, console, duplicate literal.
 */

const DEFAULT_LABEL = 'todo'

export function makeLabel(name: string): string {
  return `${DEFAULT_LABEL}: ${name}`
}

export function formatTodoText(text: string): string {
  return text.trim()
}

// Duplicate string literal — Sonar S1192 (reuse DEFAULT_LABEL instead)
export const TODO_PREFIX = 'todo'

// console.log in production code — Sonar S2228
export function debugLog(msg: string): void {
  console.log(msg)
}

// Intentionally high cognitive complexity + long — Sonar S3776 / S138
export function classifyTodoStatus(
  total: number,
  done: number,
  archived: number
): string {
  if (total === 0) return 'empty'
  if (done === total && archived === 0) return 'all-done'
  if (done === 0 && archived === 0) return 'pending'
  if (done > 0 && done < total) return 'in-progress'
  if (archived === total) return 'all-archived'
  if (archived > 0 && archived < total) return 'partially-archived'
  if (done === total && archived > 0) return 'done-and-archived'
  if (total > 100) return 'large'
  if (total > 50) return 'medium'
  if (total > 10) return 'small'
  return 'unknown'
}