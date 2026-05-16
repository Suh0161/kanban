# Jokel Backend API

Production-ready REST API for the Jokel planning and Kanban application. Built with **Node.js**, **Express**, and **SQLite** (via `better-sqlite3`).

---

## Overview

The Jokel backend provides a stateless JSON API that powers workspace management, Kanban boards, tasks, comments, attachments, and checklists. Data is persisted in a local SQLite database file.

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Database | SQLite (`better-sqlite3`) |
| Auth | JWT (Bearer tokens) |
| File Uploads | Multer + swappable storage backend (currently local disk) |

---

## Prerequisites

- **Node.js** `>= 20`
- **npm** (ships with Node.js)

---

## Installation

```bash
cd backend
npm install
```

Create your environment file from the provided example:

```bash
cp .env.example .env
```

Then edit `.env` to fit your environment (see [Environment Variables](#environment-variables) below).

---

## Environment Variables

All configuration is read from a `.env` file in the `backend/` directory.

| Variable | Description | Default / Required |
|----------|-------------|-------------------|
| `NODE_ENV` | Application environment | `development` |
| `PORT` | HTTP server port | `3001` |
| `DB_PATH` | Path to the SQLite database file | `./database/jokel.db` |
| `JWT_SECRET` | Secret key for signing JWTs | **Required** (min 32 characters recommended in production) |
| `FRONTEND_URL` | Origin URL for CORS in production | `http://localhost:5173` |

**Production checklist:**
- Set `NODE_ENV=production`
- Generate a strong `JWT_SECRET` (at least 32 characters)
- Point `FRONTEND_URL` to your deployed frontend origin

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start in development mode with auto-reload (`node --watch`). Also regenerates `docs/openapi.json` on startup. |
| `npm start` | Start in production mode (`node src/server.js`) |
| `npm run seed` | Seed the database with demo workspaces, columns, tasks, and users |
| `npm run lint` | Run ESLint on the `src/` directory |
| `npm run lint:fix` | Run ESLint and automatically fix issues |
| `npm run openapi:generate` | Regenerate `docs/openapi.json` from the registered routes |
| `npm run openapi:check` | Verify the committed `docs/openapi.json` matches what the code would generate (CI guard) |

---

## API documentation (OpenAPI 3.0)

The API spec is **generated from code**. Each route is registered through
`defineRoute()` (in `src/openapi/route.js`) which:

1. Validates the incoming request against a Zod schema (body, params, query)
2. Adds the route to the OpenAPI registry with the same schema

This gives you one source of truth for runtime validation **and** the docs.

```js
// src/routes/tasks.js
import { z } from 'zod';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { Task, Priority } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/tasks');

const CreateTaskBody = z.object({
  columnId: z.string(),
  title: z.string().min(1).max(500),
  priority: Priority.optional(),
});

defineRoute(
  router,
  {
    method: 'post',
    path: '/',
    tag: 'Tasks',
    summary: 'Create task',
    body: CreateTaskBody,
    responses: { 201: { description: 'Created', schema: Task } },
  },
  (req, res, next) => { /* req.body is already validated */ }
);
```

### Workflow when adding/changing a route

```bash
# Add the route + Zod schema in src/routes/...
# Save the file. `npm run dev` regenerates docs/openapi.json automatically.
git add src/routes/yourfile.js docs/openapi.json
git commit
```

### CI

In CI, run `npm run openapi:check`. It rebuilds the spec from the current
code in memory and exits non-zero if the committed `docs/openapi.json` is
out of date — same pattern most production API repos use to keep generated
artifacts honest.

---

## API Overview

All API routes are prefixed with `/api` unless noted otherwise.

| Prefix | Resource |
|--------|----------|
| `GET /api/health` | Health check |
| `/api/auth` | Authentication (register, login, me) |
| `/api/workspaces` | Workspaces & members |
| `/api/board` | Board data by workspace |
| `/api/columns` | Kanban columns |
| `/api/tasks` | Tasks (cards) |
| `/api/tasks/:taskId/comments` | Task comments |
| `/api/tasks/:taskId/attachments` | File attachments |
| `/api/tasks/:taskId/checklists` | Checklists |
| `/api/checklists/:id/items` | Checklist items |
| `/api/checklist-items/:id` | Toggle/update checklist items |
| `/api/v1/attachments/:id/file` | Authenticated file stream (signed-URL friendly) |

---

## Authentication

The API uses **JWT Bearer tokens** passed in the `Authorization` header.

1. Register or login via `/api/auth/register` or `/api/auth/login` to receive a token.
2. Include the token on every protected request:

```http
Authorization: Bearer <jwt_token>
```

Protected routes will return `401 Unauthorized` if the token is missing, expired, or invalid.

---

## Security Features

- **Helmet** — Sets secure HTTP response headers. Configured with `crossOriginResourcePolicy: cross-origin` to support static uploads.
- **Rate Limiting** — General API requests are limited per 15-minute window (`1000` in development, `100` in production). Auth endpoints have a stricter limit (`100` in development, `10` in production).
- **CORS** — In development, all origins are allowed. In production, only `FRONTEND_URL` is permitted. Credentials are enabled.
- **Input Validation** — Zod schemas attached to each route via `defineRoute()` validate body, path params, and query strings. The same schemas drive the OpenAPI spec, so docs and runtime checks can never drift.
- **Request Body Limits** — JSON and URL-encoded payloads are capped at `1mb`.
- **File Uploads** — Handled by Multer at the request edge, then streamed into a swappable storage backend (`services/storage/`) which currently writes to local disk. Each attachment record stores `storage_key`, `mime_type`, `size`, and `sha256` for integrity. Files are served through an authenticated API route with short-lived signed URLs (no public static mount).

---

## Database

Jokel uses a **file-based SQLite** database managed by `better-sqlite3`.

- **Schema**: defined in `../database/schema.sql`
- **Default path**: `./database/jokel.db` (configurable via `DB_PATH`)

The schema includes tables for:

- `users`
- `workspaces` & `workspace_members`
- `columns` (Kanban columns)
- `tasks` & `task_tags`
- `comments`
- `attachments`
- `checklists` & `checklist_items`

Indexes are created on foreign-key and lookup columns for performant queries.

---

## File Uploads

Attachments are uploaded via `POST /api/v1/tasks/:taskId/attachments` (multipart/form-data, field name: `file`).

- **Storage backend:** `services/storage/` — currently `localDisk.js`. Files land under `backend/uploads/<storage_key>`, where `storage_key` is opaque to the rest of the app.
- **DB row owns metadata only:** `id`, `task_id`, `name`, `storage_key`, `mime_type`, `size`, `sha256`, `url`. The `url` field is the **public, stable** API path (`/api/v1/attachments/<id>/file`) so the storage layout can change without invalidating any client.
- **Serving:** `GET /api/v1/attachments/:id/file` streams bytes after auth + workspace-membership check. Browsers can't send `Authorization` headers on `<img src>`, so the API hands clients **per-user signed URLs** (`?token=<HMAC>`) which carry identity for an hour. Same model as S3 presigned URLs.
- **Cleanup:** `DELETE /api/v1/attachments/:id` removes the row and asks the storage backend to drop the bytes.

> ⚠️ **Temporary solution.** Local-disk storage is fine for development and a single-node deployment, but it doesn't survive multi-instance scale-out, has no redundancy, and shares fate with the API process's filesystem. For production, drop in an S3-compatible backend by implementing the same four methods (`put`, `get`, `remove`, `exists`) in a new `services/storage/s3.js` and swapping the import in `services/storage/index.js`. No route, schema, or client change is required — that is the whole point of the abstraction.

---

## Error Format

All errors follow a consistent JSON shape:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE"
}
```

In **development** mode, an additional `stack` field is included for debugging:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "stack": "Error: ..."
}
```

Common error codes:

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing or invalid JWT |
| `NOT_FOUND` | Route or resource does not exist |
| `VALIDATION_ERROR` | Request body failed validation |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Health Check

```http
GET /api/health
```

**Response:**

```json
{
  "ok": true,
  "env": "development"
}
```

Use this endpoint to verify the API is running and to determine the current environment.
