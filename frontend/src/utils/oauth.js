const DEFAULT_NEXT_PATH = '/workspace';
const NEXT_URL_BASE = 'https://elevate.local';
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 4096;

/** Reject garbage fragments before persisting anything to storage. */
export function isPlausibleJwt(token) {
  return (
    typeof token === 'string'
    && token.length > 0
    && token.length <= MAX_TOKEN_LENGTH
    && JWT_PATTERN.test(token)
  );
}

function currentOrigin() {
  if (typeof window === 'undefined') return NEXT_URL_BASE;
  return window.location.origin;
}

export function getSafeOauthNextPath(next) {
  const raw = typeof next === 'string' ? next.trim() : '';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return DEFAULT_NEXT_PATH;
  }

  let parsed;
  try {
    parsed = new URL(raw, currentOrigin());
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  if (parsed.origin !== currentOrigin()) return DEFAULT_NEXT_PATH;
  if (parsed.pathname !== '/workspace' && !parsed.pathname.startsWith('/workspace/')) {
    return DEFAULT_NEXT_PATH;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function parseOauthFragment(hash) {
  const raw = (typeof hash === 'string' ? hash : window.location.hash || '').replace(/^#/, '');
  if (!raw) return { token: '', next: DEFAULT_NEXT_PATH };

  const params = new URLSearchParams(raw);
  const token = params.get('token') || '';
  return {
    token: isPlausibleJwt(token) ? token : '',
    next: getSafeOauthNextPath(params.get('next')),
  };
}
