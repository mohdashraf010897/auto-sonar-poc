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

// Use existing constant instead of duplicating literal
export const TODO_PREFIX = DEFAULT_LABEL