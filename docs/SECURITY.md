# Elevate Security & Deployment Audit

A review of data handling, auth, transport, dependencies, and what it
takes to deploy on Vercel + Fly, with optional Supabase Storage or a
future Supabase Postgres migration.

---

## 1. Database posture

### What we have today
- Single-file SQLite (`database/jokel.db`) accessed via `better-sqlite3`.
- Every read / write goes through prepared statements (parameterized). No
  string concatenation, no template-literal SQL injections.
- Schema lives in `database/schema.sql`; runtime migrations in
  `backend/src/db.js` add new columns and indexes idempotently.
- Permission enforcement lives in the API layer
  (`assertWorkspaceMember`, `assertCanEdit`, `assertCanManageWorkspace`,
  `assertIsOwner`). The DB has a CHECK constraint on roles and a partial
  unique index that guarantees exactly one owner per workspace.

### What changed in this audit
- Removed the committed `database/jokel.db` from git (`git rm --cached`)
  and added a workspace-level `.gitignore` that blocks `*.db`, `*.db-shm`,
  `*.db-wal`, `.env*`, and `backend/uploads/*`.
- Documented and shipped a Postgres / Supabase migration plan
  (`database/supabase/schema.sql`) that mirrors the SQLite schema and
  layers on Row Level Security. See §6.
- Documented that Supabase Storage is optional upload storage only. It
  does not make Supabase the main database unless the backend DB layer is
  migrated from SQLite to `DATABASE_URL`.

---

## 2. Application security

### Already in place
| Area | Where | Notes |
| ---- | ----- | ----- |
| Helmet headers | `server.js` | CSP, HSTS in prod, no `x-powered-by` |
| Rate limiting | `server.js` | Global 100/15min, auth 10/15min in prod |
| JWT auth | `middleware/auth.js` | HS256, 7-day expiry, secret required |
| Bcrypt password hashing | `services/authService.js` | cost 12 |
| Account lockout | `services/authService.js` | 5 fails → 15-minute lock |
| Input sanitization | `middleware/validate.js` | strip null bytes, length cap |
| Zod schema validation | `openapi/route.js` | runtime + OpenAPI in one place |
| Magic-byte file sniff | `routes/attachments.js` | refuse non-image uploads |
| Signed attachment URLs | `services/attachmentToken.js` | 1-hour HS256 tokens, bound to user + attachment |
| API-key hashing at rest | `middleware/apikey.js` | SHA-256, prefix-only display |
| Audit log | `middleware/audit.js` | 401/403/429 events, sensitive workspace actions |
| Webhook HMAC signing | `services/webhookService.js` | per-delivery `X-Elevate-Signature` |

### Hardened in this audit
1. **CORS allowlist.** `FRONTEND_URL` now accepts a comma-separated list.
   In production, every other origin is rejected with an explicit error
   instead of being implicitly accepted.
2. **CSP tightened.** Production drops `'unsafe-inline'` from `script-src`,
   moves `scriptSrcAttr` to `'none'`, sets `frameAncestors`, `baseUri`,
   `formAction`, and `objectSrc` defensively.
3. **Per-request id.** `X-Request-Id` header generated for every request
   and echoed to the client. Frontend `ApiError` carries it for support
   workflows.
4. **JWT secret guard.** Refuses to start in production if the secret is
   the example value or shorter than 32 chars; warns in dev if missing.
5. **Body size limits.** JSON capped at 2 MB (avatar uploads), URL-encoded
   at 512 kB.
6. **Upload rate limit.** 20 uploads / minute / IP in production.
7. **SSRF defense for webhooks.** Outgoing webhook dispatch and the
   manual test endpoint:
   - Resolve the host via DNS,
   - Refuse loopback, link-local, RFC1918, CGNAT, IPv6 ULA/LL, AWS IMDS,
   - Require HTTPS in production,
   - Use 5-second AbortController timeout,
   - Use `redirect: 'manual'` so a 302 to localhost can't bypass the check.
8. **Avatar validation.** `PATCH /auth/me` now requires either an
   `https?://` URL or a `data:image/(png|jpeg|gif|webp);base64,...` data
   URL. Anything else is rejected before it hits the DB.
9. **Frontend auth client.** New `ApiError` exposes `code`, `status`,
   `requestId`. 401 responses purge the JWT + cached user automatically and
   call an optional `setUnauthorizedHandler` so the app can redirect to
   `/login`. Network failures surface as a separate `NetworkError`.
10. **`.env.example` files** rewritten with explicit warnings about
    `VITE_*` variables ending up in the browser bundle, and example
    Supabase / Postgres slots.

---

## 3. Transport & deployment headers (Vercel)

`frontend/vercel.json` sets these for every response:

| Header | Value |
| ------ | ----- |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains; preload` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | camera/mic/geo/payment/usb all `()` |
| Content-Security-Policy | locked-down policy with Supabase + dicebear allowed |

The SPA rewrite (`/(.*) -> /index.html`) keeps client-side routing working.
Long-cache headers on `/assets/*` keep Vite's hashed bundle fast.

---

## 4. Secrets & environment

- `.env` and `.env.*` (except `.env.example`) are now globally git-ignored.
- `JWT_SECRET` is REQUIRED in production. Rotate it to invalidate every
  active session.
- Service role / database connection strings live ONLY in the backend
  environment. Anything prefixed `VITE_` is shipped to the browser bundle.
  Never put a service-role key behind `VITE_`.

Generate a strong JWT secret:
```
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 5. Dependency hygiene

- `npm audit --omit=dev` should run in CI.
- Renovate or Dependabot recommended for backend + frontend.
- Pin Node version via `package.json#engines` once you're past prototyping
  (suggest `"engines": { "node": ">=20.11" }`).

---

## 6. Supabase Storage and Postgres migration

The backend currently talks to SQLite directly. Supabase Storage can be
used independently for upload bytes, but the app database remains SQLite
until the query layer is migrated.

### Optional: Supabase Storage for uploads

Supabase Storage only stores avatars, workspace assets, and task
attachments. The API still authenticates requests, records metadata in
SQLite, and streams private bytes back through signed URLs. Configure it
with `STORAGE_BACKEND=supabase`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`.

### Path A: keep the Express API, migrate DB to Postgres

1. Provision a Supabase project; copy the connection string into
   `DATABASE_URL`.
2. Run `database/supabase/schema.sql` in the Supabase SQL editor.
3. Swap `better-sqlite3` for `pg` (or `postgres-js`) and rewrite `db.js`
   to expose the same `prepare(...).get()/.all()/.run()` shape, OR adopt
   a thin query helper. The route/service layer is parameterized
   throughout so the change stays local.
4. Keep local upload storage or switch upload bytes to Supabase Storage.
   This choice is independent from the database migration.
5. Continue minting JWTs server-side (no Supabase Auth required).

### Path B: let Supabase own auth + RLS
1. Run `database/supabase/schema.sql` (includes RLS policies and a
   `handle_new_user` trigger that auto-creates `profiles` rows).
2. Move login/register to `@supabase/supabase-js` on the frontend.
3. Drop the password lockout + bcrypt code in `authService.js`. Supabase
   Auth handles password storage, MFA, magic links, and rate limits.
4. Keep the Express API (or move to Supabase Edge Functions) but replace
   `requireAuth` with a verifier that consumes the Supabase JWT
   (`supabase.auth.getUser(token)` or local JWKS verification with the
   project's JWT secret).
5. If upload bytes also move to Supabase Storage, use the bucket policies
   sketched at the bottom of `schema.sql`.

Either way, RLS in the schema is your safety net: even if a route forgets
to call `assertCanEdit`, the database will still refuse the write because
the policy ties every row to `workspace_members`.

---

## 7. Things still worth doing

- **CSRF**: not needed today because we authenticate via Authorization
  header (no cookies). If you ever switch to cookie-based sessions, add a
  CSRF token (double-submit or origin check).
- **Refresh tokens**: 7-day JWT is fine for a workspace tool but consider
  a short-lived access token + refresh token pair if compliance demands
  it (SOC 2 typically wants ≤ 1h access tokens).
- **MFA**: route through Supabase Auth (Path B above).
- **Backups**: for SQLite on Fly, keep volume snapshots enabled and also
  schedule an off-volume backup such as
  `sqlite3 /data/elevate.db ".backup /backups/$(date +%F).db"` followed
  by a copy to separate storage. Supabase Postgres has its own snapshots
  after a database migration.
- **Anomaly alerts**: pipe the `[AUDIT]` lines into a log sink (Logtail,
  Datadog, Better Stack) and alert on `LOGIN_FAILURE` spikes /
  `WORKSPACE_DELETED` events.
- **Pen test**: ZAP baseline scan against staging on every release.
