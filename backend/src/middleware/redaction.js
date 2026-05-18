const REDACTED = '[REDACTED]';

const EXACT_SENSITIVE_QUERY_KEYS = new Set([
  'api_key',
  'apikey',
  'key',
  'token',
  'code',
  'state',
  'secret',
  'client_secret',
  'password',
  'passwd',
  'pwd',
  'pass',
  'jwt',
  'access_token',
  'refresh_token',
  'id_token',
  'authorization',
  'signature',
  'sig',
  'credential',
]);

const SENSITIVE_QUERY_KEY_PATTERNS = [
  /(^|_)api_?key($|_)/,
  /(^|_)token($|_)/,
  /(^|_)secret($|_)/,
  /(^|_)password($|_)/,
  /(^|_)passwd($|_)/,
  /(^|_)pwd($|_)/,
  /(^|_)private_?key($|_)/,
  /(^|_)access_?key($|_)/,
  /(^|_)credential($|_)/,
  /(^|_)authorization($|_)/,
  /(^|_)signature($|_)/,
];

const SENSITIVE_FIELD_KEYS = new Set(
  [...EXACT_SENSITIVE_QUERY_KEYS].filter((key) => key !== 'code' && key !== 'state')
);

function normalizeKey(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function isSensitiveQueryKey(key) {
  const normalized = normalizeKey(key);
  return (
    EXACT_SENSITIVE_QUERY_KEYS.has(normalized) ||
    SENSITIVE_QUERY_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}

export function redactUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;

  try {
    const url = new URL(rawUrl, 'http://elevate.local');
    const pairs = [];

    for (const [key, value] of url.searchParams.entries()) {
      const safeValue = isSensitiveQueryKey(key) ? REDACTED : encodeURIComponent(value);
      pairs.push(`${encodeURIComponent(key)}=${safeValue}`);
    }

    return `${url.pathname}${pairs.length ? `?${pairs.join('&')}` : ''}`;
  } catch {
    return rawUrl.replace(
      /([?&])([^=&#]*?(?:api[_-]?key|token|code|state|secret|password|passwd|pwd|jwt|signature|credential|authorization)[^=&#]*)=([^&#]*)/gi,
      `$1$2=${REDACTED}`
    );
  }
}

export function redactSensitiveFields(value) {
  if (Array.isArray(value)) return value.map((item) => redactSensitiveFields(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      isSensitiveFieldKey(key) ? REDACTED : redactSensitiveFields(entry),
    ])
  );
}

function isSensitiveFieldKey(key) {
  const normalized = normalizeKey(key);
  return (
    SENSITIVE_FIELD_KEYS.has(normalized) ||
    SENSITIVE_QUERY_KEY_PATTERNS.some((pattern) => pattern.test(normalized))
  );
}
