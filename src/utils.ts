/**
 * Intentionally added for SonarCloud demo: unused variable, console, duplicate literal.
 */

const DEFAULT_LABEL = 'todo'

export function makeLabel(name: string): string {
  const unused = name.length // Sonar: Remove this unused "unused" variable (S1481)
  console.log('makeLabel called', unused) // Sonar: Remove this console.log (S2228)
  return `${DEFAULT_LABEL}: ${name}`
}

export function formatTodoText(text: string): string {
  return text.trim()
}

// Duplicate string literal (Sonar: extract "todo" constant) - same as DEFAULT_LABEL
export const TODO_PREFIX = 'todo'
