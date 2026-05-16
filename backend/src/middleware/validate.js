/**
 * String/UUID/email helpers used by route handlers for sanitization.
 *
 * Schema-based validation now lives in `openapi/route.js` (Zod-driven).
 * This module only retains the small string helpers that the handlers
 * still call to defensively trim/cap user input.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeString(str, maxLength = 5000) {
  if (typeof str !== 'string') return '';
  // Remove null bytes to prevent injection tricks
  const cleaned = str.replace(/\0/g, '').trim();
  return cleaned.slice(0, maxLength);
}

export function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email);
}

export function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}
