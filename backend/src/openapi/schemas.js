/**
 * Shared Zod schemas for domain models, registered as named OpenAPI components
 * so routes can reference them (User, Task, etc.) instead of duplicating shapes.
 */

import { z } from 'zod';
import { registry } from './registry.js';

// ---------- Primitive helpers ----------

export const SlugId = z
  .string()
  .regex(/^[a-zA-Z0-9-]+$/, 'must contain only letters, numbers, and dashes')
  .openapi({ example: 'trust-and-safety' });

export const Email = z.string().email().openapi({ example: 'user@example.com' });

export const ISODateTime = z.string().openapi({
  format: 'date-time',
  example: '2026-05-16T10:30:00.000Z',
});

// ---------- Domain models ----------

export const User = registry.register(
  'User',
  z
    .object({
      id: z.string(),
      email: Email,
      name: z.string(),
      avatar: z.string().url().nullable().optional(),
    })
    .openapi('User')
);

export const WorkspaceRole = z
  .enum(['owner', 'admin', 'member', 'viewer'])
  .openapi({ description: 'Role within a workspace', example: 'member' });

export const WorkspaceMember = registry.register(
  'WorkspaceMember',
  z
    .object({
      id: z.string(),
      email: Email,
      name: z.string(),
      avatar: z.string().url().nullable().optional(),
      role: WorkspaceRole,
    })
    .openapi('WorkspaceMember')
);

export const Workspace = registry.register(
  'Workspace',
  z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      memberCount: z.number().int().optional(),
      myRole: WorkspaceRole.optional(),
      codePrefix: z.string().optional(),
      created_at: ISODateTime.optional(),
    })
    .openapi('Workspace')
);

export const Column = registry.register(
  'Column',
  z
    .object({
      id: z.string(),
      title: z.string(),
      position: z.number().int(),
      taskIds: z.array(z.string()),
    })
    .openapi('Column')
);

export const Priority = z.enum(['Critical', 'High', 'Medium', 'Low']).openapi({
  example: 'High',
});

export const Task = registry.register(
  'Task',
  z
    .object({
      id: z.string(),
      title: z.string(),
      priority: Priority.optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      assigneeId: z.string().nullable().optional(),
      dueDate: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
      commentCount: z.number().int().optional(),
      attachmentCount: z.number().int().optional(),
      checklists: z.array(z.any()).optional(),
      columnId: z.string(),
    })
    .openapi('Task')
);

export const Comment = registry.register(
  'Comment',
  z
    .object({
      id: z.string(),
      text: z.string(),
      authorName: z.string().optional(),
      authorAvatar: z.string().url().nullable().optional(),
      created_at: ISODateTime,
    })
    .openapi('Comment')
);

export const ChecklistItem = registry.register(
  'ChecklistItem',
  z
    .object({
      id: z.string(),
      text: z.string(),
      done: z.boolean(),
    })
    .openapi('ChecklistItem')
);

export const Checklist = registry.register(
  'Checklist',
  z
    .object({
      id: z.string(),
      title: z.string(),
      items: z.array(ChecklistItem),
    })
    .openapi('Checklist')
);

export const ApiKey = registry.register(
  'ApiKey',
  z
    .object({
      id: z.string(),
      name: z.string(),
      key_prefix: z.string(),
      scopes: z.string(),
      last_used_at: ISODateTime.nullable().optional(),
      expires_at: ISODateTime.nullable().optional(),
    })
    .openapi('ApiKey')
);

export const Webhook = registry.register(
  'Webhook',
  z
    .object({
      id: z.string(),
      url: z.string().url(),
      events: z.string(),
      active: z.boolean(),
    })
    .openapi('Webhook')
);

export const ErrorResponse = registry.register(
  'Error',
  z
    .object({
      error: z.string(),
      code: z.string(),
      requestId: z.string().optional(),
    })
    .openapi('Error')
);

// ---------- Helpers used by routes ----------

/**
 * Standard error response shape for OpenAPI registration.
 */
export const errorResponse = (description) => ({
  description,
  content: {
    'application/json': { schema: ErrorResponse },
  },
});

/**
 * Wrap a schema in `application/json` content.
 */
export const jsonContent = (schema, description = '') => ({
  description,
  content: {
    'application/json': { schema },
  },
});
