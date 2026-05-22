import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { AppError } from './error.js';

const JWT_VERIFY_OPTIONS = { algorithms: ['HS256'] };

/** Verify a session JWT. Returns decoded payload or null. */
export function verifySessionToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, JWT_VERIFY_OPTIONS);
    if (!decoded?.userId || typeof decoded.userId !== 'string') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req, _res, next) {
  if (req.userId) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }

  const decoded = verifySessionToken(authHeader.slice(7));
  if (!decoded) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }
  req.userId = decoded.userId;
  next();
}
