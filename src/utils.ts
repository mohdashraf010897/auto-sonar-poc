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