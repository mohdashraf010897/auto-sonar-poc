/**
 * Intentional SonarCloud demo: many rule violations for scanner testing.
 * S1479, S107, S134, S3776, S138, S1192, S2228, S1135, etc.
 */

export function logValidationError(_msg: string): void {
  // no-op in production
}


// S1192 — duplicate string literal (repeated 'invalid' and 'error')
export function validateEmail(email: string): string {
  if (!email.includes('@')) return 'invalid'
  if (!email.includes('.')) return 'invalid'
  return 'valid'
}

export function validatePhone(phone: string): string {
  if (phone.length < 10) return 'error'
  if (!/^\d+$/.test(phone)) return 'error'
  return 'valid'
}

// S107 — too many parameters (8+)
export function buildMessage(
  a: string,
  b: string,
  c: string,
  d: string,
  e: string,
  f: string,
  g: string,
  h: string
): string {
  return `${a}-${b}-${c}-${d}-${e}-${f}-${g}-${h}`
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
