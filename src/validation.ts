/**
 * Intentional SonarCloud demo: many rule violations for scanner testing.
 * S1479, S107, S134, S3776, S138, S1192, S2228, S1135, etc.
 */

// S2228 — console in production
export function logValidationError(msg: string): void {
  console.warn('validation:', msg)
}

// S1135 — TODO comment
// TODO: refactor this module

// Shared validation result constants — extracted to avoid duplicate string literals (S1192).
// Using named constants makes the intended meaning clear and ensures consistency across functions.
const VALIDATION_INVALID = 'invalid'
const VALIDATION_ERROR = 'error'
const VALIDATION_VALID = 'valid'

// Returns 'invalid' if the email is missing '@' or '.'; otherwise 'valid'.
export function validateEmail(email: string): string {
  if (!email.includes('@')) return VALIDATION_INVALID
  if (!email.includes('.')) return VALIDATION_INVALID
  return VALIDATION_VALID
}

// Returns 'error' if the phone is too short or contains non-digit characters; otherwise 'valid'.
export function validatePhone(phone: string): string {
  if (phone.length < 10) return VALIDATION_ERROR
  if (!/^\d+$/.test(phone)) return VALIDATION_ERROR
  return VALIDATION_VALID
}

// Uses rest parameters instead of 8 positional args to satisfy S107 (max parameters rule).
// Joins all provided parts with a '-' separator into a single message string.
export function buildMessage(...parts: string[]): string {
  return parts.join('-')
}

// S1479 — switch with too many cases
export function getCategoryCode(code: number): string {
  switch (code) {
    case 1: return 'invalid'
    case 2: return 'pending'
    case 3: return 'done'
    case 4: return 'archived'
    case 5: return 'draft'
    case 6: return 'review'
    case 7: return 'rejected'
    case 8: return 'approved'
    case 9: return 'expired'
    case 10: return 'cancelled'
    case 11: return 'active'
    case 12: return 'inactive'
    default: return 'unknown'
  }
}

// S134 — nested control flow too deep (4+ levels)
export function deepCheck(
  a: boolean,
  b: boolean,
  c: boolean,
  d: boolean
): string {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          return 'all-true'
        }
        return 'd-false'
      }
      return 'c-false'
    }
    return 'b-false'
  }
  return 'a-false'
}

// S3776 + S138 — high cognitive complexity and too many lines
export function classifyPriority(
  score: number,
  urgent: boolean,
  expired: boolean
): string {
  if (score < 0) return 'invalid'
  if (score === 0 && !urgent) return 'none'
  if (score === 0 && urgent) return 'urgent-none'
  if (score > 0 && score < 10 && !urgent && !expired) return 'low'
  if (score > 0 && score < 10 && urgent && !expired) return 'low-urgent'
  if (score > 0 && score < 10 && !urgent && expired) return 'low-expired'
  if (score >= 10 && score < 50 && !urgent && !expired) return 'medium'
  if (score >= 10 && score < 50 && urgent && !expired) return 'medium-urgent'
  if (score >= 10 && score < 50 && !urgent && expired) return 'medium-expired'
  if (score >= 50 && score < 100 && !urgent && !expired) return 'high'
  if (score >= 50 && score < 100 && urgent && !expired) return 'high-urgent'
  if (score >= 50 && score < 100 && !urgent && expired) return 'high-expired'
  if (score >= 100 && !urgent && !expired) return 'critical'
  if (score >= 100 && urgent && !expired) return 'critical-urgent'
  if (score >= 100 && !urgent && expired) return 'critical-expired'
  return 'unknown'
}
