/**
 * Workspace branding assets — logo + background image.
 *
 * Mirrors `routes/avatars.js`: multipart upload writes bytes to object
 * storage and a small URL pointer to the workspace row. Public GETs
 * stream the bytes so `<img>` tags work without auth headers, with a
 * long Cache-Control because URLs change on replace.
 */

import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';
import { assertCanManageWorkspace } from '../services/workspaceService.js';
import { saveWorkspaceAsset, readWorkspaceAsset } from '../services/workspaceAssetService.js';
import { defineRoute } from '../openapi/route.js';
import { jsonContent } from '../openapi/schemas.js';

function isValidImageFile(filePath) {
  try {
    const buffer = readFileSync(filePath);
    const signatures = [
      [0xFF, 0xD8, 0xFF],          // JPEG
      [0x89, 0x50, 0x4E, 0x47],    // PNG
      [0x47, 0x49, 0x46, 0x38],    // GIF
      [0x52, 0x49, 0x46, 0x46],    // WebP (RIFF)
    ];
    return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
  } catch {
    return false;
  }
}

// Logos top out at 2 MB (mostly small SVG/PNG); backgrounds at 5 MB
// since they're full-canvas images.
function makeUploader(limitBytes, prefix) {
  return multer({
    storage: multer.diskStorage({
      destination: tmpdir(),
      filename: (_req, file, cb) => {
        const ext = file.originalname.includes('.')
          ? '.' + file.originalname.split('.').pop()
          : '';
        cb(null, `Elevate-${prefix}-${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: limitBytes },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new AppError('Only image files are allowed', 400, 'VALIDATION_ERROR'), false);
    },
  });
}

const uploadLogo = makeUploader(2 * 1024 * 1024, 'logo');
const uploadBackground = makeUploader(5 * 1024 * 1024, 'background');

const router = Router();

// Workspace ids are slug-style (e.g. "aed-129b" from createWorkspace) or UUIDs — not always UUIDs.
const WorkspaceIdParam = z.object({ workspaceId: z.string().min(1).max(200) });
const AssetParams = z.object({
  workspaceId: z.string().min(1).max(200),
  filename: z.string().regex(/^[\w.-]+$/, 'invalid filename'),
});
const AssetUploadForm = z.object({
  file: z.any().openapi({ type: 'string', format: 'binary' }),
});

// ────────────────────────────────────────────────────────────────────────────
// Logo
// ────────────────────────────────────────────────────────────────────────────

defineRoute(
  router,
  {
    method: 'post',
    path: '/workspaces/:workspaceId/logo',
    tag: 'Workspaces',
    summary: 'Upload workspace logo',
    description: 'Replaces the workspace logo. Max 2 MB. Owner / admin only.',
    params: WorkspaceIdParam,
    multipart: AssetUploadForm,
    middleware: [requireAuth, uploadLogo.single('file')],
    responses: {
      200: jsonContent(z.object({ url: z.string() }), 'Logo saved'),
      400: { description: 'Invalid file' },
      403: { description: 'Insufficient role' },
    },
  },
  async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      assertCanManageWorkspace(db, req.userId, workspaceId);
      const file = req.file;
      if (!file) throw new AppError('File is required', 400, 'VALIDATION_ERROR');
      if (!isValidImageFile(file.path)) {
        try { unlinkSync(file.path); } catch { /* ignore */ }
        throw new AppError('Invalid image file', 400, 'VALIDATION_ERROR');
      }
      const { url } = await saveWorkspaceAsset(db, 'logo', workspaceId, {
        tempPath: file.path,
        mimeType: file.mimetype,
      });
      res.json({ url });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'get',
    path: '/logos/:workspaceId/:filename',
    tag: 'Workspaces',
    summary: 'Stream workspace logo',
    description: 'Public so `<img>` tags can render without auth headers. URL changes when the logo is replaced, so a 1-week immutable cache is safe.',
    public: true,
    params: AssetParams,
    responses: {
      200: { description: 'Logo bytes' },
      404: { description: 'Logo not found' },
    },
  },
  (req, res, next) => {
    streamAsset(req, res, next, 'logo').catch(next);
  }
);

// ────────────────────────────────────────────────────────────────────────────
// Background
// ────────────────────────────────────────────────────────────────────────────

defineRoute(
  router,
  {
    method: 'post',
    path: '/workspaces/:workspaceId/background',
    tag: 'Workspaces',
    summary: 'Upload board background image',
    description: 'Replaces the board background image. Max 5 MB. Owner / admin only. Set the workspace `background` field directly to clear the image or use a CSS color instead.',
    params: WorkspaceIdParam,
    multipart: AssetUploadForm,
    middleware: [requireAuth, uploadBackground.single('file')],
    responses: {
      200: jsonContent(z.object({ url: z.string() }), 'Background saved'),
      400: { description: 'Invalid file' },
      403: { description: 'Insufficient role' },
    },
  },
  async (req, res, next) => {
    try {
      const { workspaceId } = req.params;
      assertCanManageWorkspace(db, req.userId, workspaceId);
      const file = req.file;
      if (!file) throw new AppError('File is required', 400, 'VALIDATION_ERROR');
      if (!isValidImageFile(file.path)) {
        try { unlinkSync(file.path); } catch { /* ignore */ }
        throw new AppError('Invalid image file', 400, 'VALIDATION_ERROR');
      }
      const { url } = await saveWorkspaceAsset(db, 'background', workspaceId, {
        tempPath: file.path,
        mimeType: file.mimetype,
      });
      res.json({ url });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'get',
    path: '/backgrounds/:workspaceId/:filename',
    tag: 'Workspaces',
    summary: 'Stream board background image',
    description: 'Public so `<img>` tags can render without auth headers. URL changes when replaced, so a 1-week immutable cache is safe.',
    public: true,
    params: AssetParams,
    responses: {
      200: { description: 'Background bytes' },
      404: { description: 'Background not found' },
    },
  },
  (req, res, next) => {
    streamAsset(req, res, next, 'background').catch(next);
  }
);

// Shared streamer for both kinds. Async so it works with both the
// synchronous local-disk backend and the async Supabase backend.
async function streamAsset(req, res, next, kind) {
  try {
    const { workspaceId, filename } = req.params;
    const file = await readWorkspaceAsset(kind, workspaceId, filename);
    if (!file) throw new AppError('Not found', 404, 'NOT_FOUND');

    const ext = filename.toLowerCase().split('.').pop();
    const ct = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    }[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', ct);
    if (file.size !== null && file.size !== undefined) res.setHeader('Content-Length', file.size);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    file.stream.on('error', next);
    file.stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

export default router;
