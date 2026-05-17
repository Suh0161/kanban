/**
 * Avatar upload + download routes.
 *
 * Why a dedicated route instead of stuffing base64 into the database:
 *  - Keeps the `users` row tiny (just a URL pointer).
 *  - Lets the storage backend swap to Supabase Storage / S3 / R2 / CDN
 *    without touching this code — same `services/storage` abstraction
 *    already used for task attachments.
 *  - Streams bytes and sets cache headers, so browsers reuse the file
 *    instead of round-tripping the full image on every page load.
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
import { saveAvatarFromUpload, readAvatar } from '../services/avatarService.js';
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

const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, cb) => {
      const ext = file.originalname.includes('.')
        ? '.' + file.originalname.split('.').pop()
        : '';
      cb(null, `Elevate-avatar-${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new AppError('Only image files are allowed', 400, 'VALIDATION_ERROR'), false);
  },
});

const router = Router();

function requireUserSession(req, _res, next) {
  if (req.apiKeyId) {
    return next(new AppError('User session required to upload avatar', 403, 'INSUFFICIENT_SCOPE'));
  }
  return next();
}

const AvatarParams = z.object({
  userId: z.string().uuid(),
  filename: z.string().regex(/^[\w.-]+$/, 'invalid filename'),
});

const AvatarUploadForm = z.object({
  file: z.any().openapi({ type: 'string', format: 'binary' }),
});

defineRoute(
  router,
  {
    method: 'post',
    path: '/auth/avatar',
    tag: 'Auth',
    summary: 'Upload my avatar',
    description: 'Replaces the calling user\'s avatar. Bytes go to object storage; the user row only keeps a URL pointer (~tens of bytes).',
    multipart: AvatarUploadForm,
    middleware: [requireAuth, requireUserSession, upload.single('file')],
    responses: {
      200: jsonContent(z.object({ url: z.string() }), 'Avatar saved'),
      400: { description: 'Invalid file' },
      403: { description: 'User session required' },
    },
  },
  async (req, res, next) => {
    try {
      const file = req.file;
      if (!file) throw new AppError('File is required', 400, 'VALIDATION_ERROR');
      if (!isValidImageFile(file.path)) {
        try { unlinkSync(file.path); } catch { /* ignore */ }
        throw new AppError('Invalid image file', 400, 'VALIDATION_ERROR');
      }
      const { url } = await saveAvatarFromUpload(db, req.userId, {
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
    path: '/avatars/:userId/:filename',
    tag: 'Auth',
    summary: 'Stream avatar bytes',
    description: 'Public read endpoint so <img> tags can render avatars without an Authorization header. Same posture as Slack / GitHub user-content URLs.',
    public: true,
    params: AvatarParams,
    responses: {
      200: { description: 'Avatar bytes' },
      404: { description: 'Avatar not found' },
    },
  },
  (req, res, next) => {
    try {
      const { userId, filename } = req.params;
      const file = readAvatar(userId, filename);
      if (!file) throw new AppError('Avatar not found', 404, 'NOT_FOUND');

      // Pick a content type from the extension. Storage doesn't track it.
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
      // Avatars are cacheable; 7-day max-age + immutable since the URL
      // changes every time the avatar is replaced (UUID in the path).
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      file.stream.on('error', next);
      file.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
