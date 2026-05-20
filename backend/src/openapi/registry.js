/**
 * Single OpenAPI registry instance, shared across all route modules.
 * Routes register themselves via `validate()` (see middleware/validate.js).
 *
 * The fully-built spec is produced lazily by buildOpenApiDocument().
 */

import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

// Patch Zod with .openapi() helpers
extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Security schemes (referenced by name from each route)
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

registry.registerComponent('securitySchemes', 'apiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
});

/**
 * Build the OpenAPI 3.0 document.
 * Called lazily on first /api/spec request and cached in production.
 */
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  // Server list. Production is always first so committed openapi.json and the
  // docs portal show the public base URL for copy/examples. PUBLIC_API_URL
  // overrides the default app host when set (e.g. Fly). Try It uses the
  // page origin at runtime (see docs/assets/api-urls.js), not servers[0].
  const CANONICAL_API_ORIGIN = 'https://app.arcnvd.com';
  const publicApiUrl = process.env.PUBLIC_API_URL?.trim();
  const productionOrigin = (publicApiUrl || CANONICAL_API_ORIGIN).replace(/\/$/, '');
  const servers = [
    { url: `${productionOrigin}/api/v1`, description: 'Production' },
    { url: 'http://localhost:3001/api/v1', description: 'Local dev' },
  ];

  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Elevate API',
      version: '1.0.0',
      description:
        'REST API for Elevate, a planning workspace for engineering teams. ' +
        'Authenticate via JWT bearer tokens (from /api/v1/auth/login) or API keys ' +
        '(X-API-Key header). Use workspace_id to scope all operations.',
      contact: { name: 'Elevate' },
    },
    servers,
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    tags: [
      { name: 'Auth',        description: 'Register, login, and user info' },
      { name: 'Workspaces',  description: 'Create and manage workspaces' },
      { name: 'Board',       description: 'Full board state with optional filters' },
      { name: 'Columns',     description: 'Kanban columns — create, reorder, archive' },
      { name: 'Tasks',       description: 'Task CRUD, move, batch operations, archive' },
      { name: 'Comments',    description: 'Task comments' },
      { name: 'Attachments', description: 'File uploads and management' },
      { name: 'Checklists',  description: 'Checklists and items' },
      { name: 'API Keys',    description: 'Generate and manage API keys for external access' },
      { name: 'Webhooks',    description: 'Real-time event notifications' },
      { name: 'Presence',    description: 'User presence and online status' },
      { name: 'System',      description: 'Health check and diagnostics' },
    ],
  });
}
