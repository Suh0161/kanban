const DEV_API_BASE = 'http://localhost:3001/api/v1';

function resolveApiBase() {
  const configured = import.meta.env.VITE_API_BASE?.trim();
  if (configured) return configured;
  if (import.meta.env.DEV) return DEV_API_BASE;
  throw new Error(
    'VITE_API_BASE is required in production. Set it at build time (see frontend/.env.example).',
  );
}

const API_BASE = resolveApiBase();
const ACCESS_TOKEN_SS_KEY = 'Elevate-access';
const CSRF_SS_KEY = 'Elevate-csrf';
const LEGACY_TOKEN_KEY = 'Elevate-token';
const AUTH_USER_KEY = 'Elevate-auth';
const CSRF_COOKIE = 'elevate_csrf';

// API_ORIGIN is API_BASE without the /api/v1 suffix, used to resolve
// relative storage URLs the server returns (e.g. /api/v1/avatars/...).
const API_ORIGIN = (() => {
  try { return new URL(API_BASE).origin; }
  catch { return ''; }
})();

export function getApiBase() {
  return API_BASE;
}

/**
 * Absolute URL for an OAuth start endpoint. Anchors / `window.location`
 * navigation use this directly so we don't go through `fetch` (the
 * browser needs to do the redirect itself).
 */
export function getOauthStartUrl(providerId, { redirect } = {}) {
  const url = new URL(`${API_BASE}/auth/oauth/${encodeURIComponent(providerId)}/start`);
  if (redirect) url.searchParams.set('redirect', redirect);
  return url.toString();
}

/**
 * Resolve a relative server URL against the API origin so <img src> works
 * when the frontend is on a different host than the backend.
 * - Absolute http(s) URLs and data URLs pass through unchanged.
 * - Falsy values pass through (caller decides on a fallback).
 */
export function resolveServerUrl(url) {
  if (!url) return url;
  if (typeof url !== 'string') return url;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

let accessToken = null;
let csrfToken = null;
let refreshPromise = null;

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function getAccessToken() {
  return accessToken;
}

function setAccessToken(token) {
  accessToken = token || null;
  try {
    if (token) sessionStorage.setItem(ACCESS_TOKEN_SS_KEY, token);
    else sessionStorage.removeItem(ACCESS_TOKEN_SS_KEY);
  } catch {
    // sessionStorage unavailable — in-memory token still works for this tab.
  }
}

function setCsrfToken(token) {
  csrfToken = token || null;
  try {
    if (token) sessionStorage.setItem(CSRF_SS_KEY, token);
    else sessionStorage.removeItem(CSRF_SS_KEY);
  } catch {
    // sessionStorage unavailable — in-memory token still works for this tab.
  }
}

function getCsrfToken() {
  return csrfToken || readCookie(CSRF_COOKIE) || null;
}

/** Hydrate in-memory access + CSRF tokens from sessionStorage on boot. */
export function hydrateAccessTokenFromSessionStorage() {
  try {
    if (!accessToken) {
      const stored = sessionStorage.getItem(ACCESS_TOKEN_SS_KEY);
      if (stored) accessToken = stored;
    }
    if (!csrfToken) {
      const storedCsrf = sessionStorage.getItem(CSRF_SS_KEY);
      if (storedCsrf) csrfToken = storedCsrf;
    }
  } catch {
    // ignore
  }
}

/** One-time migration from localStorage JWT storage to refresh-cookie sessions. */
export function migrateLegacyAccessToken() {
  try {
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (!legacy) return;
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    if (!accessToken) setAccessToken(legacy);
  } catch {
    // ignore
  }
}

/** Persist tokens returned by login / refresh / OAuth exchange. */
export function setAuthTokens({ token, csrfToken: csrf } = {}) {
  if (token) setAccessToken(token);
  if (csrf) setCsrfToken(csrf);
}

function applyAuthResponse(data) {
  if (data?.token) setAccessToken(data.token);
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
}

let sessionClearHandler = null;

/** Called by useAuth so 401 responses also clear in-memory session state. */
export function setSessionClearHandler(fn) {
  sessionClearHandler = typeof fn === 'function' ? fn : null;
}

function clearAuthStorage() {
  setAccessToken(null);
  setCsrfToken(null);
  refreshPromise = null;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_SS_KEY);
    sessionStorage.removeItem(CSRF_SS_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // storage unavailable — ignore.
  }
  if (sessionClearHandler) sessionClearHandler();
}

/** Clear persisted credentials and in-memory auth subscribers. */
export function clearAuthSession() {
  clearAuthStorage();
}

/**
 * Custom error class so callers can branch on `err.code` / `err.status`.
 * Network failures still surface as plain Errors with `name = 'NetworkError'`.
 */
export class ApiError extends Error {
  constructor({ message, code, status, requestId }) {
    super(message);
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN';
    this.status = status || 0;
    this.requestId = requestId || null;
  }
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null;
}

function authMutationHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const csrf = getCsrfToken();
  if (csrf) headers['X-CSRF-Token'] = csrf;
  return headers;
}

function shouldSendCredentials(path) {
  return path.startsWith('/auth');
}

async function parseJsonResponse(res) {
  if (res.status === 204) return null;
  return res.json();
}

async function postAuthMutation(path, body = undefined) {
  const url = `${API_BASE}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: authMutationHeaders(),
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    const e = new Error(err?.message || 'Network error');
    e.name = 'NetworkError';
    throw e;
  }

  const requestId = res.headers.get('X-Request-Id') || null;

  if (!res.ok) {
    let payload = {};
    try { payload = await res.json(); } catch { /* ignore */ }
    throw new ApiError({
      message: payload.error || `HTTP ${res.status}`,
      code: payload.code || `HTTP_${res.status}`,
      status: res.status,
      requestId,
    });
  }

  const data = await parseJsonResponse(res);
  applyAuthResponse(data);
  return data;
}

/** Silent session restore on app boot — uses HttpOnly refresh cookie. */
export async function restoreSessionFromRefresh() {
  return postAuthMutation('/auth/refresh');
}

/** Exchange OAuth fragment JWT for refresh cookies + short-lived access token. */
export async function exchangeOauthToken(token) {
  return postAuthMutation('/auth/oauth/exchange', { token });
}

/** Revoke refresh cookie server-side, then clear local session. */
export async function logoutSession() {
  try {
    await postAuthMutation('/auth/logout');
  } catch {
    // Network failure still clears local state below.
  } finally {
    clearAuthSession();
  }
}

async function tryRefreshSession() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = restoreSessionFromRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getAccessToken();
  const sentAuth = !!token;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const credentials = shouldSendCredentials(path) || options.credentials === 'include'
    ? 'include'
    : 'omit';

  let res;
  try {
    res = await fetch(url, { ...options, headers, credentials });
  } catch (err) {
    const e = new Error(err?.message || 'Network error');
    e.name = 'NetworkError';
    throw e;
  }

  const requestId = res.headers.get('X-Request-Id') || null;

  if (res.status === 401) {
    const canRetry = sentAuth
      && !options._retriedAfterRefresh
      && path !== '/auth/refresh'
      && path !== '/auth/login'
      && path !== '/auth/register';

    if (canRetry) {
      try {
        await tryRefreshSession();
        return apiFetch(path, { ...options, _retriedAfterRefresh: true });
      } catch {
        clearAuthSession();
        if (unauthorizedHandler) unauthorizedHandler();
        throw new ApiError({ message: 'Unauthorized', code: 'UNAUTHORIZED', status: 401, requestId });
      }
    }

    if (sentAuth) {
      clearAuthSession();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    throw new ApiError({ message: 'Unauthorized', code: 'UNAUTHORIZED', status: 401, requestId });
  }

  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError({
      message: body.error || `HTTP ${res.status}`,
      code: body.code || `HTTP_${res.status}`,
      status: res.status,
      requestId,
    });
  }

  const data = await parseJsonResponse(res);
  if (path.startsWith('/auth') && data) applyAuthResponse(data);
  return data;
}

export function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}

export async function apiGetList(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  const fullUrl = query ? `${url}?${query}` : url;
  return apiFetch(fullUrl, { method: 'GET' });
}

export async function apiGetBoard(workspaceId, params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.priority) query.set('priority', params.priority);
  if (params.tags && params.tags.length > 0) query.set('tags', params.tags.join(','));
  const qs = query.toString();
  const url = `/board/${workspaceId}${qs ? `?${qs}` : ''}`;
  return apiFetch(url, { method: 'GET' });
}

export function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch(path, body) {
  return apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

/**
 * Upload a file to a multipart endpoint. Browsers set the multipart
 * boundary header automatically — we only attach the auth token.
 */
export async function apiUpload(path, formData, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { ...options.headers };
  const token = getAccessToken();
  const sentAuth = !!token;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: shouldSendCredentials(path) ? 'include' : 'omit',
    });
  } catch (err) {
    const e = new Error(err?.message || 'Network error');
    e.name = 'NetworkError';
    throw e;
  }

  const requestId = res.headers.get('X-Request-Id') || null;

  if (res.status === 401) {
    const canRetry = sentAuth && !options._retriedAfterRefresh;
    if (canRetry) {
      try {
        await tryRefreshSession();
        return apiUpload(path, formData, { ...options, _retriedAfterRefresh: true });
      } catch {
        clearAuthSession();
        if (unauthorizedHandler) unauthorizedHandler();
        throw new ApiError({ message: 'Unauthorized', code: 'UNAUTHORIZED', status: 401, requestId });
      }
    }
    if (sentAuth) {
      clearAuthSession();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    throw new ApiError({ message: 'Unauthorized', code: 'UNAUTHORIZED', status: 401, requestId });
  }
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError({
      message: body.error || `HTTP ${res.status}`,
      code: body.code || `HTTP_${res.status}`,
      status: res.status,
      requestId,
    });
  }
  if (res.status === 204) return null;
  return res.json();
}
