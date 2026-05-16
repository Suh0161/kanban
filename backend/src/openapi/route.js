/**
 * `defineRoute` — register an Express handler with OpenAPI metadata + Zod
 * runtime validation in one call. This is the single source of truth: the
 * spec is generated from these calls, and the same Zod schemas validate the
 * request at runtime.
 *
 * Usage:
 *
 *   defineRoute(router, {
 *     method: 'post',
 *     path: '/tasks',
 *     tag: 'Tasks',
 *     summary: 'Create task',
 *     body: CreateTaskBody,
 *     responses: {
 *       201: { description: 'Created', schema: Task },
 *     },
 *   }, handler)
 *
 * The Express path uses `:param` style; OpenAPI gets the `{param}` form.
 */

import { registry } from './registry.js';
import { AppError } from '../middleware/error.js';

const expressToOpenApiPath = (p) => p.replace(/:([a-zA-Z_]\w*)/g, '{$1}');

function joinPath(prefix, path) {
  const a = (prefix || '').replace(/\/+$/, '');
  const b = (path || '').replace(/^\/+/, '/');
  const joined = `${a}${b.startsWith('/') ? '' : '/'}${b}`;
  // Collapse double slashes, keep root '/'
  return joined.replace(/\/+/g, '/').replace(/(.+)\/$/, '$1') || '/';
}

function makeValidationMiddleware({ body, params, query }) {
  return (req, _res, next) => {
    try {
      if (params) {
        const r = params.safeParse(req.params);
        if (!r.success) throw zodToAppError('params', r.error);
        req.params = r.data;
      }
      if (query) {
        const r = query.safeParse(req.query);
        if (!r.success) throw zodToAppError('query', r.error);
        req.query = r.data;
      }
      if (body) {
        const r = body.safeParse(req.body || {});
        if (!r.success) throw zodToAppError('body', r.error);
        req.body = r.data;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function zodToAppError(where, err) {
  const issues = err.issues || err.errors || [];
  const messages = issues.map((i) => {
    const path = i.path && i.path.length ? i.path.join('.') : where;
    return `${path}: ${i.message}`;
  });
  return new AppError(messages.join('; ') || 'Invalid request', 400, 'VALIDATION_ERROR');
}

/**
 * Register a route on `router` and on the OpenAPI registry.
 *
 * @param {import('express').Router} router
 * @param {object} def
 * @param {('get'|'post'|'put'|'patch'|'delete')} def.method
 * @param {string} def.path                     - Express path, e.g. '/:id/move'
 * @param {string} [def.prefix]                  - mount prefix for OpenAPI, e.g. '/auth'
 * @param {string} def.tag                       - OpenAPI tag (e.g. 'Tasks')
 * @param {string} [def.summary]
 * @param {string} [def.description]
 * @param {boolean} [def.public]                 - if true, no auth required (security: [])
 * @param {import('zod').ZodTypeAny} [def.body]
 * @param {import('zod').ZodTypeAny} [def.params]
 * @param {import('zod').ZodTypeAny} [def.query]
 * @param {Record<string|number, { description: string, schema?: import('zod').ZodTypeAny }>} [def.responses]
 * @param {import('express').RequestHandler[]} [def.middleware] - extra middleware before validation
 * @param {import('express').RequestHandler} handler
 *
 * Set `router._defaultMiddleware = [requireAuth]` (typically via the
 * `withAuth(router)` helper) to apply middleware to every route registered
 * on the router. Per-route `middleware:` is appended after the defaults.
 */
export function defineRoute(router, def, handler) {
  const {
    method,
    path,
    prefix = router._openapiPrefix || '',
    tag,
    summary,
    description,
    body,
    params,
    query,
    responses = { 200: { description: 'OK' } },
    middleware = [],
    public: isPublic,
    multipart,
  } = def;

  // Build OpenAPI registration
  const oapiResponses = {};
  for (const [code, def] of Object.entries(responses)) {
    if (def.schema) {
      oapiResponses[code] = {
        description: def.description || '',
        content: { 'application/json': { schema: def.schema } },
      };
    } else {
      oapiResponses[code] = { description: def.description || '' };
    }
  }

  const oapiRequest = {};
  if (params) oapiRequest.params = params;
  if (query) oapiRequest.query = query;
  if (body) {
    oapiRequest.body = {
      content: { 'application/json': { schema: body } },
    };
  } else if (multipart) {
    oapiRequest.body = {
      content: { 'multipart/form-data': { schema: multipart } },
    };
  }

  registry.registerPath({
    method,
    path: expressToOpenApiPath(joinPath(prefix, path)),
    tags: [tag],
    summary,
    description,
    security: isPublic ? [] : undefined,
    request: Object.keys(oapiRequest).length ? oapiRequest : undefined,
    responses: oapiResponses,
  });

  // Wire Express
  const validation = makeValidationMiddleware({ body, params, query });
  const defaultMiddleware = router._defaultMiddleware || [];
  router[method](path, ...defaultMiddleware, ...middleware, validation, handler);
}

/**
 * `validate({ body, params, query })` — standalone middleware factory used by
 * routes that don't want full OpenAPI registration (rare; prefer defineRoute).
 */
export function validate(schemas) {
  return makeValidationMiddleware(schemas);
}

/**
 * Wrap an Express router so all `defineRoute` calls automatically receive a
 * shared OpenAPI prefix matching where the router is mounted.
 *
 *   const router = withPrefix(Router(), '/auth');
 *   defineRoute(router, { method: 'post', path: '/login', ... }, handler);
 *   // → registers POST /auth/login in the spec, but the Express path stays '/login'
 */
export function withPrefix(router, prefix) {
  router._openapiPrefix = prefix;
  return router;
}

/**
 * Apply default middleware (e.g. requireAuth) to every route defined on this
 * router via `defineRoute`. Routes that need to opt out should be on a
 * separate router. Routes can append more per-route middleware via the
 * `middleware:` option in their definition.
 *
 *   const router = withDefaultMiddleware(Router(), [requireAuth]);
 *   defineRoute(router, { method: 'get', path: '/me', ... }, handler);
 *   // → requireAuth runs before the handler.
 */
export function withDefaultMiddleware(router, middlewares) {
  router._defaultMiddleware = middlewares;
  return router;
}
