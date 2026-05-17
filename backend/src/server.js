import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

import { PORT, FRONTEND_URLS, IS_DEV, IS_PROD } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requestLogger } from './middleware/logger.js';
import { auditMiddleware } from './middleware/audit.js';
import { requireApiKey } from './middleware/apikey.js';

import './db.js';

import authRoutes from './routes/auth.js';
import oauthRoutes from './routes/oauth.js';
import avatarRoutes from './routes/avatars.js';
import workspaceRoutes from './routes/workspaces.js';
import workspaceAssetRoutes from './routes/workspaceAssets.js';
import boardRoutes from './routes/board.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import attachmentRoutes from './routes/attachments.js';
import checklistRoutes from './routes/checklists.js';
import watcherRoutes from './routes/watchers.js';
import activityRouter from './routes/activity.js';
import presenceRouter from './routes/presence.js';
import apiKeysRouter from './routes/api-keys.js';
import webhooksRouter from './routes/webhooks.js';
import systemRouter from './routes/system.js';
import docsRouter from './routes/docs.js';

const app = express();

// Remove fingerprinting
app.disable('x-powered-by');

// Trust proxy only in production (for accurate client IP behind reverse proxy)
if (IS_PROD) {
  app.set('trust proxy', 1);
}

// Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // No unsafe-inline for scripts in production. Inline styles stay
      // permitted because Vite ships some inline ones; tighten when we
      // emit a nonce.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: IS_PROD ? ["'self'"] : ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc: ["'self'", ...FRONTEND_URLS],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://fonts.googleapis.com', 'data:'],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: IS_PROD ? [] : null,
    },
  },
  // Open the resource policy so the SPA on a different origin can fetch
  // attachments. We rely on auth + signed tokens for those bytes.
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: IS_PROD
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

// CORS: explicit allowlist. Reject everything not in FRONTEND_URLS in prod.
const allowedOrigins = new Set(FRONTEND_URLS);
app.use(cors({
  origin(origin, cb) {
    // Same-origin / curl / server-to-server have no Origin header.
    if (!origin) return cb(null, true);
    if (IS_DEV) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
}));

// Per-request id for log correlation (also returned to the client).
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
});

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
}));

// Stricter rate limit for password-handling endpoints. The oauth start
// route triggers a third-party redirect (not a credential check), and
// /auth/me / /auth/oauth/providers are read-only, so we don't burn them
// through this bucket — they fall back to the general limit above.
const authBruteForceLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_DEV ? 100 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many auth attempts, please try again later.', code: 'RATE_LIMITED' },
});
app.use('/api/v1/auth/login', authBruteForceLimit);
app.use('/api/v1/auth/register', authBruteForceLimit);

// Stricter rate limit for write-heavy attachment uploads (per IP)
app.use('/api/v1/tasks/:taskId/attachments', rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? 60 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many uploads, slow down.', code: 'RATE_LIMITED' },
}));

// Same ceiling for avatar uploads — these write to storage and resize the
// avatar table row, so we don't want a runaway client looping on it.
app.use('/api/v1/auth/avatar', rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? 30 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many avatar uploads, slow down.', code: 'RATE_LIMITED' },
}));

// Workspace branding uploads (logo + background) hit storage too.
app.use(['/api/v1/workspaces/:workspaceId/logo', '/api/v1/workspaces/:workspaceId/background'], rateLimit({
  windowMs: 60 * 1000,
  max: IS_DEV ? 30 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: { error: 'Too many uploads, slow down.', code: 'RATE_LIMITED' },
}));

// Body parsing with limits — JSON kept tight (avatar uploads use multipart now
// for binary attachments; the 2MB ceiling here covers base64 avatar PATCHes).
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// Request logging
app.use(requestLogger);

// API key middleware (runs before JWT auth — sets req.userId if valid key provided)
app.use(requireApiKey);

// Audit logging middleware (captures 401/403/429 responses)
app.use(auditMiddleware);

// Health check (before auth routes)
app.use('/api', systemRouter);

// Silence Chrome DevTools probe (no-op 204)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end();
});

// API routes (v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/auth', oauthRoutes);
app.use('/api/v1', avatarRoutes);
app.use('/api/v1', workspaceAssetRoutes);
app.use('/api/v1/workspaces', workspaceRoutes);
app.use('/api/v1/board', boardRoutes);
app.use('/api/v1/columns', columnRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1', commentRoutes);
app.use('/api/v1', attachmentRoutes);
app.use('/api/v1', checklistRoutes);
app.use('/api/v1', watcherRoutes);
app.use('/api/v1', activityRouter);
app.use('/api/v1', presenceRouter);
app.use('/api/v1', apiKeysRouter);
app.use('/api/v1', webhooksRouter);
app.use('/api/v1', systemRouter);  // /api/v1/health for the spec
app.use('/api', docsRouter);       // GET /api/docs (public), GET /api/spec (JSON)

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Elevate API running on http://localhost:${PORT} (${IS_DEV ? 'development' : 'production'})`);

  // Warm the OpenAPI registry so `/api/spec` serves an in-memory copy
  // without first-hit latency. Production never touches disk; dev keeps
  // `docs/openapi.json` synced as a developer convenience.
  if (IS_DEV) {
    import('./openapi/generate.js')
      .then(({ writeOpenApiJson }) => writeOpenApiJson())
      .then((path) => console.log(`[openapi] dev spec written to ${path}`))
      .catch((err) => console.warn('[openapi] dev regen skipped:', err.message));
  } else {
    import('./openapi/generate.js')
      .then(({ buildSpec }) => buildSpec())
      .then(() => console.log('[openapi] spec ready (in-memory)'))
      .catch((err) => console.warn('[openapi] warm-up failed:', err.message));
  }
});

// Connection timeouts
server.timeout = 30000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
