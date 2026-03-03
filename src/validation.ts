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

// Interface for buildMessage parameters
interface MessageComponents {
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  g: string;
  h: string;
}

export function buildMessage(components: MessageComponents): string {
  const { a, b, c, d, e, f, g, h } = components;
  return `${a}-${b}-${c}-${d}-${e}-${f}-${g}-${h}`;
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

// Score ranges
const SCORE_RANGES = {
  LOW: { min: 0, max: 10 },
  MEDIUM: { min: 10, max: 50 },
  HIGH: { min: 50, max: 100 }
} as const;

// Priority classification helpers
const isInRange = (score: number, range: { min: number; max: number }): boolean => 
  score >= range.min && score < range.max;

const getScoreLevel = (score: number): string => {
  if (isInRange(score, SCORE_RANGES.LOW)) return 'low';
  if (isInRange(score, SCORE_RANGES.MEDIUM)) return 'medium';
  if (score >= SCORE_RANGES.HIGH.min) return 'high';
  return '';
};

const buildPriorityKey = (level: string, urgent: boolean, expired: boolean): string => {
  const parts = [level];
  if (urgent) parts.push('urgent');
  if (expired) parts.push('expired');
  return parts.join('-');
};

export function classifyPriority(
  score: number,
  urgent: boolean,
  expired: boolean
): string {
  if (score < 0) return 'invalid';
  
  if (score === 0) {
    return urgent ? 'urgent-none' : 'none';
  }

  const level = getScoreLevel(score);
  return buildPriorityKey(level, urgent, expired);
  if (score >= 50 && score < 100 && !urgent && expired) return 'high-expired'
  if (score >= 100 && !urgent && !expired) return 'critical'
  if (score >= 100 && urgent && !expired) return 'critical-urgent'
  if (score >= 100 && !urgent && expired) return 'critical-expired'
  return 'unknown'
}
