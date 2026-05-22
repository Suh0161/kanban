import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/error.js';
import { generateAccessToken } from './authService.js';
import { verifySessionToken } from '../middleware/auth.js';
import {
  generateCsrfToken,
  readCsrfCookie,
  readRefreshCookie,
  REFRESH_MAX_AGE_MS,
  setSessionCookies,
} from '../utils/authCookies.js';

const REFRESH_TOKEN_BYTES = 32;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function expiresAtIso() {
  return new Date(Date.now() + REFRESH_MAX_AGE_MS).toISOString();
}

function generateRawToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

function insertToken(db, { userId, familyId, rawToken }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, family_id, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, hashToken(rawToken), familyId, expiresAtIso());
  return rawToken;
}

export function revokeTokenFamily(db, familyId) {
  db.prepare(`
    UPDATE refresh_tokens
       SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE family_id = ?
       AND revoked_at IS NULL
  `).run(familyId);
}

function revokeToken(db, tokenId) {
  db.prepare(`
    UPDATE refresh_tokens
       SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?
       AND revoked_at IS NULL
  `).run(tokenId);
}

function findByHash(db, tokenHash) {
  return db.prepare(`
    SELECT id, user_id, family_id, expires_at, revoked_at
      FROM refresh_tokens
     WHERE token_hash = ?
  `).get(tokenHash);
}

/**
 * Issue a fresh refresh-token family (login / register / OAuth).
 * Sets HttpOnly refresh + readable CSRF cookies on `res`.
 * Returns the short-lived access JWT for the JSON body.
 */
export function establishSession(db, res, userId) {
  const familyId = uuidv4();
  const refreshToken = insertToken(db, { userId, familyId, rawToken: generateRawToken() });
  const csrfToken = generateCsrfToken();
  setSessionCookies(res, refreshToken, csrfToken);
  return { accessToken: generateAccessToken(userId), csrfToken };
}

/**
 * Validate the refresh cookie, rotate to a new token in the same family,
 * refresh cookies, and return a new access JWT.
 */
export function rotateRefreshToken(db, res, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const row = findByHash(db, hashToken(rawToken));
  if (!row) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  if (row.revoked_at) {
    revokeTokenFamily(db, row.family_id);
    throw new AppError('Session revoked due to token reuse', 401, 'UNAUTHORIZED');
  }

  if (row.expires_at <= new Date().toISOString()) {
    revokeToken(db, row.id);
    throw new AppError('Session expired', 401, 'UNAUTHORIZED');
  }

  const newRefreshToken = db.transaction(() => {
    revokeToken(db, row.id);
    return insertToken(db, {
      userId: row.user_id,
      familyId: row.family_id,
      rawToken: generateRawToken(),
    });
  })();

  const csrfToken = generateCsrfToken();
  setSessionCookies(res, newRefreshToken, csrfToken);
  return { accessToken: generateAccessToken(row.user_id), csrfToken, userId: row.user_id };
}

/**
 * OAuth / cross-origin handoff: verify a short-lived access JWT from the URL
 * fragment, ensure refresh + CSRF cookies exist on the API origin, return session
 * material for the SPA JSON body.
 */
export function exchangeAccessToken(db, req, res, accessToken) {
  const decoded = verifySessionToken(accessToken);
  if (!decoded) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }

  const rawRefresh = readRefreshCookie(req);
  const csrfFromCookie = readCsrfCookie(req);
  if (rawRefresh && csrfFromCookie) {
    return { accessToken, csrfToken: csrfFromCookie, userId: decoded.userId };
  }

  return establishSession(db, res, decoded.userId);
}

/**
 * Revoke the refresh-token family and clear session cookies.
 */
export function revokeRefreshToken(db, res, rawToken) {
  if (rawToken && typeof rawToken === 'string') {
    const row = findByHash(db, hashToken(rawToken));
    if (row) revokeTokenFamily(db, row.family_id);
  }
}
