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
// Constants for validation results
const INVALID_RESULT = 'invalid';
const ERROR_RESULT = 'error';
const VALID_RESULT = 'valid';

export function validateEmail(email: string): string {
  if (!email.includes('@')) return INVALID_RESULT;
  if (!email.includes('.')) return INVALID_RESULT;
  return VALID_RESULT;
}

export function validatePhone(phone: string): string {
  if (phone.length < 10) return ERROR_RESULT;
  if (!/^\d+$/.test(phone)) return ERROR_RESULT;
  return VALID_RESULT;
}

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
  return `${parts.a}-${parts.b}-${parts.c}-${parts.d}-${parts.e}-${parts.f}-${parts.g}-${parts.h}`;
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

// Constants for score ranges
const SCORE_RANGES = {
  LOW: { min: 0, max: 10 },
  MEDIUM: { min: 10, max: 50 },
  HIGH: { min: 50, max: 100 }
} as const;

// Helper function to determine score category
function getScoreCategory(score: number): 'low' | 'medium' | 'high' | null {
  if (score > 0 && score < SCORE_RANGES.LOW.max) return 'low';
  if (score >= SCORE_RANGES.MEDIUM.min && score < SCORE_RANGES.MEDIUM.max) return 'medium';
  if (score >= SCORE_RANGES.HIGH.min && score < SCORE_RANGES.HIGH.max) return 'high';
  return null;
}

// Helper function to build priority string with modifiers
function buildPriorityString(category: string, urgent: boolean, expired: boolean): string {
  const modifiers = [];
  if (urgent) modifiers.push('urgent');
  if (expired) modifiers.push('expired');
  
  return modifiers.length > 0 ? `${category}-${modifiers.join('-')}` : category;
}

export function classifyPriority(
  score: number,
  urgent: boolean,
  expired: boolean
): string {
  if (score < 0) return 'invalid';
  
  if (score === 0) {
    return urgent ? 'urgent-none' : 'none';
  }
  
  const category = getScoreCategory(score);
  if (category) {
    return buildPriorityString(category, urgent, expired);
  }
  
  return 'unknown';
  if (score >= 50 && score < 100 && !urgent && expired) return 'high-expired'
  if (score >= 100 && !urgent && !expired) return 'critical'
  if (score >= 100 && urgent && !expired) return 'critical-urgent'
  if (score >= 100 && !urgent && expired) return 'critical-expired'
  return 'unknown'
}
