const DEFAULT_NEXT_PATH = '/workspace';
const NEXT_URL_BASE = 'https://elevate.local';

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
  return {
    token: params.get('token') || '',
    next: getSafeOauthNextPath(params.get('next')),
  };
}
