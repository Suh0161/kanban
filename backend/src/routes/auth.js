import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { sanitizeString } from '../middleware/validate.js';
import { auditLog } from '../middleware/audit.js';
import { registerUser, loginUser, getUserById, updateUser } from '../services/authService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { User, Email, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/auth');

// ---------- Schemas ----------

const RegisterBody = z.object({
  email: Email,
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
});

const LoginBody = z.object({
  email: Email,
  password: z.string().min(1),
});

const AuthSuccess = z.object({
  user: User,
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
});

// ---------- Routes ----------

defineRoute(
  router,
  {
    method: 'post',
    path: '/register',
    tag: 'Auth',
    summary: 'Register a new user',
    public: true,
    body: RegisterBody,
    responses: {
      201: { description: 'User created', schema: AuthSuccess },
      409: errorResponse('Email already exists'),
    },
  },
  async (req, res, next) => {
    try {
      const email = sanitizeString(req.body.email, 254).trim().toLowerCase();
      const name = sanitizeString(req.body.name, 100);
      const result = registerUser(db, { email, name, password: req.body.password });
      auditLog('REGISTER', { email, userId: result.user.id });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'post',
    path: '/login',
    tag: 'Auth',
    summary: 'Login',
    public: true,
    body: LoginBody,
    responses: {
      200: { description: 'Login successful', schema: AuthSuccess },
      401: errorResponse('Invalid credentials'),
      429: errorResponse('Account temporarily locked due to failed attempts'),
    },
  },
  async (req, res, next) => {
    try {
      const email = sanitizeString(req.body.email, 254).trim().toLowerCase();
      let result;
      try {
        result = loginUser(db, { email, password: req.body.password });
      } catch (err) {
        if (err.code === 'RATE_LIMITED') {
          auditLog('LOGIN_FAILURE', { email, reason: 'account_locked' });
        } else if (err.code === 'UNAUTHORIZED') {
          auditLog('LOGIN_FAILURE', { email, reason: 'invalid_credentials' });
        }
        throw err;
      }
      auditLog('LOGIN_SUCCESS', { email, userId: result.user.id });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

defineRoute(
  router,
  {
    method: 'get',
    path: '/me',
    tag: 'Auth',
    summary: 'Get current user',
    middleware: [requireAuth],
    responses: {
      200: jsonContent(z.object({ user: User }), 'Current user'),
      401: errorResponse('Not authenticated'),
    },
  },
  (req, res, next) => {
    try {
      const user = getUserById(db, req.userId);
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

const UpdateMeBody = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().nullable().optional(),
  password: z.string().min(8).max(128).optional(),
  currentPassword: z.string().optional(),
});

defineRoute(
  router,
  {
    method: 'patch',
    path: '/me',
    tag: 'Auth',
    summary: 'Update current user profile',
    middleware: [requireAuth],
    body: UpdateMeBody,
    responses: {
      200: jsonContent(z.object({ user: User }), 'Updated user'),
      400: errorResponse('Validation error'),
      401: errorResponse('Current password incorrect'),
    },
  },
  async (req, res, next) => {
    try {
      const updates = {};
      if (req.body.name !== undefined) updates.name = sanitizeString(req.body.name, 100);
      if (req.body.avatar !== undefined) updates.avatar = req.body.avatar;
      if (req.body.password !== undefined) {
        updates.password = req.body.password;
        updates.currentPassword = req.body.currentPassword;
      }
      const user = updateUser(db, req.userId, updates);
      // Refresh stored user in localStorage via response
      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
