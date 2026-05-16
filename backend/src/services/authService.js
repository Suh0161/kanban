import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { AppError } from '../middleware/error.js';

const failedAttempts = new Map();

const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

function generateToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ userId, iat: now }, JWT_SECRET, { expiresIn: '7d' });
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
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    recordFailedAttempt(email);
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
    fields.push('avatar = ?');
    values.push(updates.avatar || null);
  }

  if (updates.password !== undefined) {
    if (!isPasswordStrong(updates.password)) {
      throw new AppError(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        400,
        'VALIDATION_ERROR'
      );
    }
    if (updates.currentPassword) {
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
      if (!user || !bcrypt.compareSync(updates.currentPassword, user.password_hash)) {
        throw new AppError('Current password is incorrect', 401, 'UNAUTHORIZED');
      }
    }
    fields.push('password_hash = ?');
    values.push(bcrypt.hashSync(updates.password, 12));
  }

  if (fields.length === 0) return getUserById(db, userId);

  values.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getUserById(db, userId);
}
