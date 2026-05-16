import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { IS_DEV } from '../config.js';
import { buildOpenApiDocument } from '../openapi/registry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const DOCS_ROOT = join(__dirname, '..', '..', '..', 'docs');

// In-memory cache for HTML/CSS/JS in production. Bypassed in dev.
const cache = new Map();

function readDocsFile(relativePath) {
  if (!IS_DEV && cache.has(relativePath)) return cache.get(relativePath);
  const abs = join(DOCS_ROOT, relativePath);
  // Defensive: prevent path traversal outside DOCS_ROOT
  if (!abs.startsWith(DOCS_ROOT)) return null;
  if (!existsSync(abs)) return null;
  const content = readFileSync(abs);
  if (!IS_DEV) cache.set(relativePath, content);
  return content;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon'
};

function sendFile(res, relativePath) {
  const buf = readDocsFile(relativePath);
  if (!buf) return res.status(404).type('html').send('<h1>404 — Not found</h1>');
  const ext = extname(relativePath).toLowerCase();
  res.type(MIME[ext] || 'application/octet-stream');
  res.send(buf);
}

// ---------- Pages ----------
router.get('/docs',                       (_req, res) => sendFile(res, 'index.html'));
router.get('/docs/',                      (_req, res) => sendFile(res, 'index.html'));
router.get('/docs/reference',             (_req, res) => sendFile(res, 'reference.html'));
router.get('/docs/reference/',            (_req, res) => sendFile(res, 'reference.html'));
router.get('/docs/guides',                (_req, res) => res.redirect(302, '/api/docs/guides/quickstart'));
router.get('/docs/guides/',               (_req, res) => res.redirect(302, '/api/docs/guides/quickstart'));
router.get('/docs/guides/quickstart',     (_req, res) => sendFile(res, 'guides/quickstart.html'));
router.get('/docs/guides/authentication', (_req, res) => sendFile(res, 'guides/authentication.html'));
router.get('/docs/guides/webhooks',       (_req, res) => sendFile(res, 'guides/webhooks.html'));

// ---------- Assets ----------
router.get('/docs/assets/style.css',    (_req, res) => sendFile(res, 'assets/style.css'));
router.get('/docs/assets/docs.js',      (_req, res) => sendFile(res, 'assets/docs.js'));
router.get('/docs/assets/reference.js', (_req, res) => sendFile(res, 'assets/reference.js'));
router.get('/docs/assets/hero.png',     (_req, res) => sendFile(res, 'assets/hero.png'));

// ---------- OpenAPI spec (generated from code) ----------
let specCache = null;
router.get('/spec', (_req, res) => {
  if (!specCache || IS_DEV) {
    try {
      specCache = buildOpenApiDocument();
    } catch (err) {
      return res.status(500).json({ error: 'failed to build spec', detail: err.message });
    }
  }
  res.json(specCache);
});

export default router;
