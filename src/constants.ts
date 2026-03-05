// Shared validation result constants used across validation functions.
// Centralising them here avoids duplicate string literals (S1192) and
// makes the valid set of return values easy to discover and update.
export const VALIDATION_INVALID = 'invalid'
export const VALIDATION_ERROR = 'error'
export const VALIDATION_VALID = 'valid'
