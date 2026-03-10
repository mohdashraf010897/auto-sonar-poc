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
// Constants to avoid duplicate string literals
const VALIDATION_INVALID = 'invalid';
const VALIDATION_ERROR = 'error';
const VALIDATION_VALID = 'valid';

export function validateEmail(email: string): string {
  if (!email.includes('@')) return VALIDATION_INVALID
  if (!email.includes('.')) return VALIDATION_INVALID
  return VALIDATION_VALID
}

export function validatePhone(phone: string): string {
  if (phone.length < 10) return VALIDATION_ERROR
  if (!/^\d+$/.test(phone)) return VALIDATION_ERROR
  return VALIDATION_VALID
}

// Interface to reduce parameter count
interface MessageParts {
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  g: string;
  h: string;
}

export function buildMessage(parts: MessageParts): string {
  return `${parts.a}-${parts.b}-${parts.c}-${parts.d}-${parts.e}-${parts.f}-${parts.g}-${parts.h}`
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

// Constants for score thresholds
const SCORE_THRESHOLDS = {
  MIN_VALID: 0,
  LOW_MAX: 10,
  MEDIUM_MAX: 50,
  HIGH_MAX: 100
} as const;

// Helper functions to reduce complexity
function getScoreCategory(score: number): 'invalid' | 'zero' | 'low' | 'medium' | 'high' | 'max' {
  if (score < SCORE_THRESHOLDS.MIN_VALID) return 'invalid';
  if (score === 0) return 'zero';
  if (score < SCORE_THRESHOLDS.LOW_MAX) return 'low';
  if (score < SCORE_THRESHOLDS.MEDIUM_MAX) return 'medium';
  if (score < SCORE_THRESHOLDS.HIGH_MAX) return 'high';
  return 'max';
}

function getPriorityModifier(urgent: boolean, expired: boolean): string {
  if (urgent && !expired) return '-urgent';
  if (!urgent && expired) return '-expired';
  if (urgent && expired) return '-urgent-expired';
  return '';
}

export function classifyPriority(
  score: number,
  urgent: boolean,
  expired: boolean
): string {
  const category = getScoreCategory(score);
  
  if (category === 'invalid') return 'invalid';
  
  if (category === 'zero') {
    return urgent ? 'urgent-none' : 'none';
  }
  
  const modifier = getPriorityModifier(urgent, expired);
  return `${category}${modifier}`;
  if (score >= 50 && score < 100 && !urgent && expired) return 'high-expired'
  if (score >= 100 && !urgent && !expired) return 'critical'
  if (score >= 100 && urgent && !expired) return 'critical-urgent'
  if (score >= 100 && !urgent && expired) return 'critical-expired'
  return 'unknown'
}
