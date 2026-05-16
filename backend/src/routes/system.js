import { Router } from 'express';
import { z } from 'zod';
import { IS_DEV } from '../config.js';
import { defineRoute } from '../openapi/route.js';
import { jsonContent } from '../openapi/schemas.js';

const router = Router();

const HealthResponse = z.object({
  ok: z.boolean(),
  env: z.enum(['development', 'production']),
});

defineRoute(
  router,
  {
    method: 'get',
    path: '/health',
    tag: 'System',
    summary: 'Health check',
    description: 'Returns ok=true when the API is up.',
    public: true,
    responses: { 200: jsonContent(HealthResponse, 'Service is healthy') },
  },
  (_req, res) => {
    res.json({ ok: true, env: IS_DEV ? 'development' : 'production' });
  }
);

export default router;
