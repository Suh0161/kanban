const isDev = import.meta.env.DEV;

/** Marketing site (arcnvd.com). */
export const SITE_URL =
  import.meta.env.VITE_SITE_URL ||
  (isDev ? 'http://localhost:5174' : 'https://arcnvd.com');

/** Canonical login path — keep in sync with website `APP_LOGIN_PATH`. */
export const LOGIN_PATH = '/login';

/**
 * Marketing "Sign in" links append this so LoginPage clears a cached JWT
 * and shows the form instead of silently redirecting to /workspace.
 */
export const LOGIN_FRESH_PARAM = 'fresh';

export function loginSearch({ fresh = false } = {}) {
  return fresh ? `${LOGIN_FRESH_PARAM}=1` : '';
}

export function isPublicAuthPath(pathname) {
  return (
    pathname === '/'
    || pathname === LOGIN_PATH
    || pathname === '/oauth/callback'
    || pathname === '/privacy'
    || pathname === '/terms'
  );
}
