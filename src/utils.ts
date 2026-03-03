/**
 * Intentionally added for SonarCloud demo: console, duplicate literals, complexity, too many params.
 */

const DEFAULT_LABEL = 'todo'

export function makeLabel(name: string): string {
  return `${DEFAULT_LABEL}: ${name}`
}

export function formatTodoText(text: string): string {
  return text.trim()
}

// Duplicate string literal — Sonar S1192 (reuse DEFAULT_LABEL instead)
export const TODO_PREFIX = DEFAULT_LABEL

// More S1192 — repeated 'todo' and 'error' literals
export function getTypeLabel(type: string): string {
  if (type === 'todo') return 'Todo'
  if (type === 'task') return 'Todo'
  return type
}

export function getErrorKind(code: number): string {
  if (code === 0) return 'error'
  if (code === 1) return 'error'
  if (code === 2) return 'warning'
  return 'error'
}

export function debugLog(_msg: string): void {
  // no-op in production
}

export function reportError(_msg: string): void {
  // no-op in production
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

// S107 — too many parameters (8+)
export function mergeFields(
  f1: string,
  f2: string,
  f3: string,
  f4: string,
  f5: string,
  f6: string,
  f7: string,
  f8: string
): string {
  return [f1, f2, f3, f4, f5, f6, f7, f8].join('-')
}