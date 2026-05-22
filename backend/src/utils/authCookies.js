import crypto from 'crypto';
import { IS_PROD } from '../config.js';
import { AppError } from '../middleware/error.js';

export const REFRESH_COOKIE = 'elevate_refresh';
export const CSRF_COOKIE = 'elevate_csrf';
export const AUTH_COOKIE_PATH = '/api/v1/auth';
export const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const baseCookieOpts = {
  sameSite: 'lax',
  secure: IS_PROD,
  path: AUTH_COOKIE_PATH,
  maxAge: REFRESH_MAX_AGE_MS,
};

export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function setSessionCookies(res, refreshToken, csrfToken) {
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseCookieOpts, httpOnly: true });
  res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookieOpts, httpOnly: false });
}

export function clearSessionCookies(res) {
  const clearOpts = { path: AUTH_COOKIE_PATH, secure: IS_PROD, sameSite: 'lax' };
  res.clearCookie(REFRESH_COOKIE, { ...clearOpts, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...clearOpts, httpOnly: false });
}

export function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [key, ...rest] = trimmed.split('=');
    try {
      cookies[key] = decodeURIComponent(rest.join('='));
    } catch {
      cookies[key] = rest.join('=');
    }
  }
  return cookies;
}

/** Double-submit CSRF check for cookie-authenticated auth mutations. */
export function assertCsrfToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const header = req.headers['x-csrf-token'];
  if (!header || typeof header !== 'string' || !cookies[CSRF_COOKIE] || header !== cookies[CSRF_COOKIE]) {
    throw new AppError('Invalid CSRF token', 403, 'FORBIDDEN');
  }
}

export function readRefreshCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_COOKIE] || null;
}

export function readCsrfCookie(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[CSRF_COOKIE] || null;
}
