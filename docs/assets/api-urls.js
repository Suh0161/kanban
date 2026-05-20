/**
 * Shared API base URL helpers for the static docs portal.
 * Loaded before docs.js / reference.js (no modules — CSP-safe).
 */
(function (global) {
  const CANONICAL_API_BASE = 'https://app.arcnvd.com/api/v1';
  const LOCALHOST_RE =
    /^https?:\/\/(localhost|127(?:\.\d+){0,2}\.\d+|0\.0\.0\.0)(?::\d+)?/i;

  /** URL shown in meta, quick-ref, and curl examples (public / copy-paste). */
  function resolveDisplayBaseUrl(spec) {
    const servers = (spec && spec.servers) || [];
    for (const s of servers) {
      const url = (s && s.url ? String(s.url) : '').replace(/\/$/, '');
      if (url && !LOCALHOST_RE.test(url)) return url;
    }
    return CANONICAL_API_BASE;
  }

  /** URL for Try It — same public base as meta and curl examples. */
  function resolveTryItBaseUrl(spec) {
    return resolveDisplayBaseUrl(spec);
  }

  global.ElevateDocsUrls = {
    CANONICAL_API_BASE,
    resolveDisplayBaseUrl,
    resolveTryItBaseUrl,
  };
})(typeof window !== 'undefined' ? window : globalThis);
