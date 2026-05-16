import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { AppError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import db from '../db.js';
import { assertWorkspaceMember } from '../services/workspaceService.js';
import { getTaskWorkspaceId } from '../services/taskService.js';
import {
  createAttachmentFromUpload,
  readAttachment,
  deleteAttachment,
  getAttachmentRow,
} from '../services/attachmentService.js';
import { verifyAttachmentToken, signAttachmentToken } from '../services/attachmentToken.js';
import { logActivity } from '../services/activityService.js';
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

// Upload to OS tmpdir; the service moves it into our storage layout.
const upload = multer({
  storage: multer.diskStorage({
    destination: tmpdir(),
    filename: (_req, file, cb) => {
      const ext = file.originalname.includes('.')
        ? '.' + file.originalname.split('.').pop()
        : '';
      cb(null, `jokel-upload-${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new AppError('Only image files are allowed', 400, 'VALIDATION_ERROR'), false);
  },
});

const router = Router();
// Note: requireAuth is applied per-route below. The file-stream route uses
// signed tokens (?token=) so it doesn't require a session header.

const TaskIdParam = z.object({ taskId: z.string() });
const AttachmentIdParam = z.object({ id: z.string() });

const Attachment = z.object({
  id: z.string(),
  task_id: z.string(),
  type: z.string(),
  url: z.string(),
  name: z.string(),
  mime_type: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  sha256: z.string().nullable().optional(),
});

const UploadForm = z.object({
  file: z.any().openapi({ type: 'string', format: 'binary' }),
});

defineRoute(
  router,
  {
    method: 'post',
    path: '/tasks/:taskId/attachments',
    tag: 'Attachments',
    summary: 'Upload attachment',
    description: 'Image upload (JPEG/PNG/GIF/WebP), max 5 MB. The response carries the public URL the client should use.',
    params: TaskIdParam,
    multipart: UploadForm,
    middleware: [requireAuth, upload.single('file')],
    responses: {
      201: { description: 'Uploaded', schema: Attachment },
      400: { description: 'Invalid file' },
    },
  },
  async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const file = req.file;
      if (!file) throw new AppError('File is required', 400, 'VALIDATION_ERROR');

      const workspaceId = getTaskWorkspaceId(db, taskId);
      assertWorkspaceMember(db, req.userId, workspaceId);

      // Magic-byte sniff before we let it into storage.
      if (!isValidImageFile(file.path)) {
        try { unlinkSync(file.path); } catch { /* ignore */ }
        throw new AppError('Invalid image file', 400, 'VALIDATION_ERROR');
      }

      const attachment = await createAttachmentFromUpload(db, {
        taskId,
        tempPath: file.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        type: file.mimetype.startsWith('image/') ? 'image' : 'file',
      });

      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'ATTACHMENT_ADDED',
        entityType: 'attachment',
        entityId: attachment.id,
        detail: JSON.stringify({ taskId, name: attachment.name }),
      });

      // Return the row with a per-user signed URL so the freshly uploaded
      // image can render in <img> tags without waiting for a board refetch.
      const token = signAttachmentToken({ attachmentId: attachment.id, userId: req.userId });
      const sep = attachment.url.includes('?') ? '&' : '?';
      res.status(201).json({
        ...attachment,
        url: `${attachment.url}${sep}token=${token}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'get',
    path: '/attachments/:id/file',
    tag: 'Attachments',
    summary: 'Download attachment file',
    description:
      'Streams the attachment bytes. Authenticated via either the standard ' +
      'session/API-key headers, or via a signed `?token=` query parameter ' +
      '(used by `<img>` tags which cannot send headers). Tokens expire after ' +
      '1 hour and are bound to the requesting user.',
    params: AttachmentIdParam,
    query: z.object({ token: z.string().optional() }),
    public: true,
    responses: {
      200: { description: 'File stream' },
      401: { description: 'Missing or invalid credentials' },
      404: { description: 'Attachment not found' },
    },
  },
  (req, res, next) => {
    try {
      const { id } = req.params;

      // Resolve identity: prefer signed token (it binds attachment + user),
      // fall back to session/API-key auth on the request.
      let userId = null;
      const token = req.query.token;
      if (token) {
        const verified = verifyAttachmentToken(token);
        if (verified && verified.attachmentId === id) {
          userId = verified.userId;
        }
      }
      if (!userId && req.userId) userId = req.userId;
      if (!userId) {
        throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
      }

      const result = readAttachment(db, id);
      if (!result) throw new AppError('Attachment not found', 404, 'NOT_FOUND');

      const { row, file } = result;

      // Token verification already binds (attachment, user). Re-check workspace
      // membership with the resolved userId so revoked memberships stop access
      // even with an unexpired token.
      const workspaceId = getTaskWorkspaceId(db, row.task_id);
      assertWorkspaceMember(db, userId, workspaceId);

      if (!file) throw new AppError('Attachment file is missing', 404, 'NOT_FOUND');

      if (row.mime_type) res.setHeader('Content-Type', row.mime_type);
      if (file.size !== null && file.size !== undefined) res.setHeader('Content-Length', file.size);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(row.name || 'file')}"`);

      file.stream.on('error', next);
      file.stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'delete',
    path: '/attachments/:id',
    tag: 'Attachments',
    summary: 'Delete attachment',
    params: AttachmentIdParam,
    middleware: [requireAuth],
    responses: { 200: jsonContent(z.object({ success: z.boolean() }), 'Deleted') },
  },
  (req, res, next) => {
    try {
      const { id: attachmentId } = req.params;
      const row = getAttachmentRow(db, attachmentId);
      if (!row) throw new AppError('Attachment not found', 404, 'NOT_FOUND');

      const workspaceId = getTaskWorkspaceId(db, row.task_id);
      assertWorkspaceMember(db, req.userId, workspaceId);

      deleteAttachment(db, attachmentId);

      logActivity(db, {
        userId: req.userId,
        workspaceId,
        event: 'ATTACHMENT_DELETED',
        entityType: 'attachment',
        entityId: attachmentId,
        detail: JSON.stringify({ taskId: row.task_id }),
      });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
