import { IS_DEV } from '../config.js';
import { auditLog } from './audit.js';
import { redactUrl } from './redaction.js';

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, _next) {
  const rawStatus = err.statusCode || err.status || 500;
  const statusCode = Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
    ? rawStatus
    : 500;
  const isAppError = err instanceof AppError || err.isOperational === true;
  const isInternal = statusCode >= 500;
  const code = isInternal && !isAppError ? 'INTERNAL_ERROR' : (err.code || 'INTERNAL_ERROR');
  const requestId = req.requestId;

  // Log unexpected errors
  if (isInternal) {
    const path = redactUrl(req.originalUrl || req.url);
    console.error('[ERROR]', { requestId, method: req.method, path, code }, err);
    auditLog('SERVER_ERROR', { requestId, path, method: req.method, code });
  }

  const message = isInternal && !isAppError && !IS_DEV
    ? 'Internal server error'
    : (err.message || 'Internal server error');

  const response = {
    error: message,
    code,
  };
  if (requestId) response.requestId = requestId;

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
