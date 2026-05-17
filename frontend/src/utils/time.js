/**
 * Time helpers shared by activity feeds, settings logs, etc.
 *
 * Why this exists: SQLite's `datetime('now')` used to drop the timezone
 * marker, producing `'2026-05-17 10:30:00'`. Browsers parse such strings
 * as local time, which makes "X ago" math drift by the user's timezone
 * offset. We now write ISO-8601 UTC consistently, but `parseServerTime`
 * stays defensive in case a row from the legacy era ever shows up.
 */

/**
 * Parse a timestamp the server sent. Returns a Date or null.
 *
 * Accepts:
 *   - ISO-8601 with `Z` or offset (`'2026-05-17T10:30:00.000Z'`)
 *   - Legacy `'YYYY-MM-DD HH:MM:SS'` (treated as UTC)
 *   - Numeric epoch (ms)
 *   - `Date` instances
 */
export function parseServerTime(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value !== 'string') return null;

  // Legacy SQLite format: 'YYYY-MM-DD HH:MM:SS' (UTC, no marker).
  // Convert to ISO so it parses unambiguously.
  let normalized = value;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized = normalized.replace(' ', 'T') + 'Z';
  }

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Compact "time ago" string. For dates older than a week, falls back to
 * a locale date string so users get useful context instead of "147d ago".
 */
export function formatRelativeTime(value) {
  const date = parseServerTime(value);
  if (!date) return '';

  const diffMs = Date.now() - date.getTime();
  // Clamp negative diffs (e.g. clock skew, future dates) to "just now".
  if (diffMs < 0) return 'just now';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(diffMs / 3_600_000);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(diffMs / 86_400_000);
  if (day < 7) return `${day}d ago`;

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Absolute timestamp for tooltips (e.g. on hover of a relative label),
 * so users can confirm the precise time without ambiguity.
 */
export function formatAbsoluteTime(value) {
  const date = parseServerTime(value);
  if (!date) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
