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
const TOKEN_KEY = 'Elevate-token';

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

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let sessionClearHandler = null;

/** Called by useAuth so 401 responses also clear in-memory session state. */
export function setSessionClearHandler(fn) {
  sessionClearHandler = typeof fn === 'function' ? fn : null;
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('Elevate-auth');
  } catch {
    // localStorage unavailable — ignore.
  }
  if (sessionClearHandler) sessionClearHandler();
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

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers, credentials: 'omit' });
  } catch (err) {
    const e = new Error(err?.message || 'Network error');
    e.name = 'NetworkError';
    throw e;
  }

  const requestId = res.headers.get('X-Request-Id') || null;

  if (res.status === 401) {
    // Token expired/invalid — purge and notify the app to redirect.
    clearToken();
    if (unauthorizedHandler) unauthorizedHandler();
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
export async function apiUpload(path, formData) {
  const url = `${API_BASE}${path}`;
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: formData, credentials: 'omit' });
  } catch (err) {
    const e = new Error(err?.message || 'Network error');
    e.name = 'NetworkError';
    throw e;
  }

  const requestId = res.headers.get('X-Request-Id') || null;

  if (res.status === 401) {
    clearToken();
    if (unauthorizedHandler) unauthorizedHandler();
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
