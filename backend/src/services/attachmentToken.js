/**
 * Short-lived signed tokens for attachment URLs.
 *
 * `<img src>` requests can't send auth headers, so attachment URLs include a
 * `?token=...` query parameter — a JWT bound to (attachmentId, userId) with
 * a 1-hour expiry. Same idea as S3 presigned URLs and GitHub user-content
 * tokens: the token is the proof, signed with a server-side secret.
 *
 * Implemented with `jsonwebtoken` (already a dep) rather than a hand-rolled
 * HMAC so the format is well-understood and tested.
 */

import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

const TTL_SECONDS = 60 * 60; // 1 hour
// Namespace the secret so attachment tokens can never be confused with
// session JWTs even though they share the underlying key.
const SECRET = `attachment.v1:${JWT_SECRET}`;

/**
 * Mint a token bound to (attachmentId, userId).
 * @returns {string} a compact JWT.
 */
export function signAttachmentToken({ attachmentId, userId, ttlSeconds = TTL_SECONDS }) {
  return jwt.sign(
    { a: attachmentId, u: userId },
    SECRET,
    { expiresIn: ttlSeconds, algorithm: 'HS256' }
  );
}

/**
 * Verify a token. Returns `{ attachmentId, userId }` if valid, else null.
 */
export function verifyAttachmentToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    if (!decoded || typeof decoded !== 'object') return null;
    if (!decoded.a || !decoded.u) return null;
    return { attachmentId: decoded.a, userId: decoded.u };
  } catch {
    return null;
  }
}
