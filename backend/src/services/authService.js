import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { AppError } from '../middleware/error.js';

const failedAttempts = new Map();

const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
// Always run bcrypt on login so missing users don't leak via timing.
const TIMING_DUMMY_HASH = bcrypt.hashSync('elevate-timing-guard', 12);

function generateToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ userId, iat: now }, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
  };
}

function isPasswordStrong(password) {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) return false;
  return true;
}

function getFailedRecord(email) {
  const record = failedAttempts.get(email);
  if (!record) return null;
  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    failedAttempts.delete(email);
    return null;
  }
  return record;
}

function recordFailedAttempt(email) {
  const record = failedAttempts.get(email) || { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  failedAttempts.set(email, record);
  return record;
}

function clearFailedAttempts(email) {
  failedAttempts.delete(email);
}

export function registerUser(db, { email, name, password }) {
  if (!isPasswordStrong(password)) {
    throw new AppError(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      400,
      'VALIDATION_ERROR'
    );
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 12);

  try {
    db.prepare(
      'INSERT INTO users (id, email, name, avatar, password_hash) VALUES (?, ?, ?, ?, ?)'
    ).run(id, email, name, null, passwordHash);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw new AppError('Email already in use', 409, 'CONFLICT');
    }
    throw err;
  }

  const user = { id, email, name, avatar: null };
  const token = generateToken(user.id);
  return { user: sanitizeUser(user), token };
}

export function loginUser(db, { email, password }) {
  const record = getFailedRecord(email);
  if (record && record.lockedUntil && Date.now() < record.lockedUntil) {
    throw new AppError(
      'Account temporarily locked due to too many failed attempts. Try again later.',
      429,
      'RATE_LIMITED'
    );
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const storedHash = user?.password_hash ?? TIMING_DUMMY_HASH;
  const passwordValid = bcrypt.compareSync(password, storedHash) && Boolean(user?.password_hash);

  if (!passwordValid) {
    recordFailedAttempt(email);
    if (user && !user.password_hash) {
      throw new AppError(
        'This account was created with single sign-on. Use the social login button instead.',
        401,
        'OAUTH_ONLY_ACCOUNT'
      );
    }
    throw new AppError('Invalid credentials', 401, 'UNAUTHORIZED');
  }

  clearFailedAttempts(email);
  const token = generateToken(user.id);
  return { user: sanitizeUser(user), token };
}

export function getUserById(db, userId) {
  const user = db
    .prepare('SELECT id, email, name, avatar FROM users WHERE id = ?')
    .get(userId);
  if (!user) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  return user;
}

export function updateUser(db, userId, updates) {
  const fields = [];
  const values = [];

  if (updates.name !== undefined) {
    if (!updates.name.trim()) throw new AppError('Name is required', 400, 'VALIDATION_ERROR');
    fields.push('name = ?');
    values.push(updates.name.trim());
  }

  if (updates.avatar !== undefined) {
    // Accept three forms:
    //   1. http(s) URL (e.g. dicebear preset)
    //   2. data URL of common image mime types
    //   3. internal API path served by our own avatar route
    // Anything else is rejected so we can't store JS, SVG, or arbitrary text.
    const value = updates.avatar;
    if (value !== null && value !== '') {
      if (typeof value !== 'string') {
        throw new AppError('Invalid avatar', 400, 'VALIDATION_ERROR');
      }
      const isHttps = /^https?:\/\//i.test(value);
      const isImageDataUrl = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(value);
      const isInternalAvatar = /^\/api\/v1\/avatars\/[0-9a-f-]{36}\/[\w.-]+$/i.test(value);
      if (!isHttps && !isImageDataUrl && !isInternalAvatar) {
        throw new AppError('Avatar must be an https URL or an image data URL', 400, 'VALIDATION_ERROR');
      }
      if (value.length > 2 * 1024 * 1024) {
        throw new AppError('Avatar exceeds 2MB limit', 400, 'PAYLOAD_TOO_LARGE');
      }
    }
    fields.push('avatar = ?');
    values.push(value || null);
  }

  if (updates.password !== undefined) {
    if (!isPasswordStrong(updates.password)) {
      throw new AppError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400,
        'VALIDATION_ERROR'
      );
    }
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    if (user?.password_hash) {
      if (!updates.currentPassword || !bcrypt.compareSync(updates.currentPassword, user.password_hash)) {
        throw new AppError('Current password is incorrect', 401, 'UNAUTHORIZED');
      }
    } else if (updates.currentPassword) {
      throw new AppError('Current password is not available for this account', 400, 'VALIDATION_ERROR');
    }
    fields.push('password_hash = ?');
    values.push(bcrypt.hashSync(updates.password, 12));
  }

  if (fields.length === 0) return getUserById(db, userId);

  values.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(db, userId);
}


/**
 * Resolve an OAuth profile to a local user row.
 *
 * Order of operations:
 *   1. If we have an `oauth_identities` row for (provider, provider_user_id),
 *      use that user — this is the steady-state hot path.
 *   2. If a user row already exists for the email returned by the provider,
 *      link the new identity onto that existing account instead of creating
 *      a duplicate.
 *   3. Otherwise create a fresh user row (with no password) and link the
 *      identity to it.
 *
 * Returns `{ user, token }` ready to drop into the session cookie / URL hash.
 */
export function findOrCreateOAuthUser(db, { provider, providerUserId, email, name, avatar }) {
  if (!provider || !providerUserId || !email) {
    throw new AppError('Invalid OAuth profile', 400, 'VALIDATION_ERROR');
  }

  const linked = db.prepare(`
    SELECT u.* FROM users u
    JOIN oauth_identities i ON i.user_id = u.id
    WHERE i.provider = ? AND i.provider_user_id = ?
  `).get(provider, providerUserId);

  if (linked) {
    // Don't overwrite locally-edited name / avatar. The user is the source
    // of truth once the account exists — provider values are only used to
    // seed the row on first link, otherwise a Google login round-trip
    // would silently revert any profile change made via /auth/me.
    return {
      user: sanitizeUser(linked),
      token: generateToken(linked.id),
    };
  }

  const existingByEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existingByEmail) {
    db.prepare(
      'INSERT OR IGNORE INTO oauth_identities (user_id, provider, provider_user_id) VALUES (?, ?, ?)'
    ).run(existingByEmail.id, provider, providerUserId);
    return { user: sanitizeUser(existingByEmail), token: generateToken(existingByEmail.id) };
  }

  // First time we've seen this person — create a fresh row, link it.
  const id = uuidv4();
  db.transaction(() => {
    db.prepare(
      'INSERT INTO users (id, email, name, avatar, password_hash) VALUES (?, ?, ?, ?, NULL)'
    ).run(id, email, name, avatar || null);
    db.prepare(
      'INSERT INTO oauth_identities (user_id, provider, provider_user_id) VALUES (?, ?, ?)'
    ).run(id, provider, providerUserId);
  })();

  const user = { id, email, name, avatar: avatar || null };
  return { user: sanitizeUser(user), token: generateToken(user.id) };
}
