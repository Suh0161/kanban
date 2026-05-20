const isDev = import.meta.env.DEV;

/** Relative app paths only — blocks open redirects and odd URL shapes. */
const SAFE_RELATIVE_PATH = /^\/[\w\-./]*$/;

const LOCALHOST_ORIGIN = /^https?:\/\/localhost(:\d+)?(?:\/|$)/;

const PROD_SITE = 'https://arcnvd.com';
const PROD_APP = 'https://app.arcnvd.com';
const PROD_DOCS = 'https://app.arcnvd.com/api/docs';

const DEV_SITE = 'http://localhost:5174';
const DEV_APP = 'http://localhost:5173';
const DEV_DOCS = 'http://localhost:3001/api/docs';

/**
 * Runtime navigation URLs. In dev, production origins from `.env` are ignored
 * so Sign in / Docs always target local servers unless you set explicit
 * http://localhost:* overrides (see `.env.development`).
 */
function resolveRuntimeUrl(envValue, devDefault, prodDefault) {
  const trimmed = envValue?.trim();
  if (isDev) {
    if (trimmed && LOCALHOST_ORIGIN.test(trimmed)) {
      return trimmed.replace(/\/$/, '');
    }
    return devDefault;
  }
  return trimmed || prodDefault;
}

/** Marketing site origin (links, redirects) */
export const SITE_URL = resolveRuntimeUrl(import.meta.env.VITE_SITE_URL, DEV_SITE, PROD_SITE);

/** Elevate web application (links, redirects) */
export const APP_URL = resolveRuntimeUrl(import.meta.env.VITE_APP_URL, DEV_APP, PROD_APP);

/** API documentation portal */
export const DOCS_URL = resolveRuntimeUrl(import.meta.env.VITE_DOCS_URL, DEV_DOCS, PROD_DOCS);

/** User-facing origins in copy (legal, email footers). Never localhost. */
export const PUBLIC_SITE_URL = import.meta.env.VITE_SITE_URL || 'https://arcnvd.com';
export const PUBLIC_APP_URL = import.meta.env.VITE_APP_URL || 'https://app.arcnvd.com';

export const PUBLIC_SITE_HOST = PUBLIC_SITE_URL.replace(/^https?:\/\//, '');
export const PUBLIC_APP_HOST = PUBLIC_APP_URL.replace(/^https?:\/\//, '');

/** Frontend login route (must match frontend App.jsx). */
export const APP_LOGIN_PATH = '/login';

/** Query flag — app LoginPage clears cached session when present. */
export const LOGIN_FRESH_PARAM = 'fresh';

function formatSearch(search) {
  if (!search) return '';
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const encoded = new URLSearchParams(raw).toString();
  return encoded ? `?${encoded}` : '';
}

/** Build app deep links from the marketing site. */
export function getAppUrl(path = '', { search = '' } = {}) {
  const base = APP_URL.replace(/\/$/, '');
  const normalized = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  if (normalized && !SAFE_RELATIVE_PATH.test(normalized)) {
    throw new Error(`getAppUrl: invalid path "${path}"`);
  }

  return `${base}${normalized}${formatSearch(search)}`;
}

/** Marketing sign-in / trial CTAs — always show login UI, not silent auto-login. */
export const LOGIN_URL = getAppUrl(APP_LOGIN_PATH, { search: `${LOGIN_FRESH_PARAM}=1` });
