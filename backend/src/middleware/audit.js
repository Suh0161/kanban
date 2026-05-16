import { AUDIT_LOG_ENABLED } from '../config.js';

const SECURITY_EVENTS = new Set([
  // Auth events
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'REGISTER',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'RATE_LIMITED',
  // Workspace events
  'WORKSPACE_CREATED',
  'WORKSPACE_DELETED',
  'WORKSPACE_ACCESS_DENIED',
  // Board events
  'BOARD_ACCESS_DENIED',
  // Column events
  'COLUMN_CREATED',
  'COLUMN_DELETED',
  // Task events
  'TASK_CREATED',
  'TASK_DELETED',
  'TASK_MOVED',
  // Comment events
  'COMMENT_ADDED',
  // Attachment events
  'ATTACHMENT_ADDED',
  'ATTACHMENT_DELETED',
  // Checklist events
  'CHECKLIST_ADDED',
  'CHECKLIST_DELETED',
]);

export function auditLog(event, details = {}) {
  if (!AUDIT_LOG_ENABLED) return;
  if (!SECURITY_EVENTS.has(event)) return;

  const timestamp = new Date().toISOString();
  const safeDetails = { ...details };
  // Never log passwords or tokens
  delete safeDetails.password;
  delete safeDetails.token;
  delete safeDetails.password_hash;

  console.log(`[AUDIT] ${timestamp} ${event} ${JSON.stringify(safeDetails)}`);
}

export function auditMiddleware(req, res, next) {
  const originalJson = res.json;
  res.json = function(body) {
    const status = res.statusCode;
    if (status === 401) {
      auditLog('UNAUTHORIZED', { path: req.originalUrl, method: req.method, ip: req.ip });
    } else if (status === 403) {
      auditLog('FORBIDDEN', { path: req.originalUrl, method: req.method, ip: req.ip, userId: req.userId });
    } else if (status === 429) {
      auditLog('RATE_LIMITED', { path: req.originalUrl, method: req.method, ip: req.ip });
    }
    return originalJson.call(this, body);
  };
  next();
}
