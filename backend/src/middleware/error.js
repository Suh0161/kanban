import { IS_DEV } from '../config.js';
import { auditLog } from './audit.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log unexpected errors
  if (statusCode >= 500) {
    console.error('[ERROR]', err);
    auditLog('SERVER_ERROR', { code, message: err.message });
  }

  const response = {
    error: err.message || 'Internal server error',
    code,
  };

  // Never leak stack traces in production
  if (IS_DEV) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Cannot ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}
