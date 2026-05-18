# Deployment guide

Three things to run in production: the backend, the frontend, and durable
storage for SQLite plus user uploads. Recommended targets:

| Layer    | Where               | Why                                                |
| -------- | ------------------- | -------------------------------------------------- |
| Backend  | Fly.io              | Persistent volume keeps SQLite alive across deploys |
| Database | SQLite on Fly volume today | Current backend uses `better-sqlite3` |
| Uploads  | Fly volume by default; optional Supabase Storage | Uploads survive redeploys either way |
| Frontend | Vercel              | Static SPA, automatic HTTPS, edge CDN              |
| Website  | Vercel (separate)   | Marketing site lives at the apex domain            |

This guide walks through each in the order you want to deploy them.

---

## 0. Prerequisites

- A Fly.io account and `flyctl` installed locally.
- A Vercel account.
- The repo pushed to GitHub.
- Optional: a Supabase project if you want Supabase Storage for uploads
  or are preparing a later Postgres migration.

---

## 1. Optional: prepare Supabase Postgres

The backend still runs on SQLite today. Applying
`database/supabase/schema.sql` only prepares a future Postgres migration;
it does not move the production database until the backend DB layer is
changed to use `DATABASE_URL`.

1. Open your project in Supabase → **SQL Editor → New query**.
2. Paste the contents of `database/supabase/schema.sql`.
3. Run it. The script is idempotent; you can re-run it after schema
   changes without losing data.

Verify in **Table Editor**: you should see `profiles`, `workspaces`,
`workspace_members`, `tasks`, etc.

---

## 2. Optional: create a Supabase Storage bucket

Supabase Storage is optional and only stores upload bytes (avatars,
workspace assets, and task attachments). It does not make the main
application database Supabase; SQLite remains the source of truth until
the DB layer is migrated.

1. Supabase → **Storage → New bucket**.
2. Name: `elevate`. Public: **off**. The API serves bytes itself with
   short-lived signed URLs, so the bucket stays private.
3. Skip RLS policies for now — the backend authenticates with the
   service-role key, which bypasses RLS.

> If you ever want browser uploads to go direct to Storage (no backend
> hop), you'll need RLS policies on `storage.objects`. Until then,
> uploads always flow through the API.

---

## 3. Deploy the backend to Fly.io

The repo ships a ready-to-go `Dockerfile` and `fly.toml` at the root.

```bash
# One-time
fly auth login
fly apps create kanban-elevate
fly volumes create elevate_data --region sin --size 1
fly scale count 1
```

Set required secrets:

```bash
# Strong JWT secret (48 random bytes, base64).
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")"

# Your deployed frontend origin (comma-separate for multiple).
fly secrets set FRONTEND_URL="https://elevate.vercel.app,https://app.elevate.com"

# Public backend origin. Used for generated API docs/server URLs and
# same-origin CORS checks. Match the Fly app hostname.
fly secrets set PUBLIC_API_URL="https://kanban-elevate.fly.dev"
```

`fly.toml` already sets the production SQLite/local-upload paths:

```toml
DB_PATH = "/data/elevate.db"
UPLOADS_DIR = "/data/uploads"
```

Keep the backend at one machine while SQLite and local uploads live on a
single attached volume. Scale out only after moving the database and
upload storage to services that support concurrent writers.

If you choose Supabase Storage for uploads, set these additional backend
secrets:

```bash
fly secrets set \
  STORAGE_BACKEND=supabase \
  SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY="ey..." \
  SUPABASE_STORAGE_BUCKET=elevate
```

Set OAuth secrets only if you've configured those providers:

```bash
# OAuth (only if you've set them up — see backend/.env.example).
fly secrets set \
  GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
  GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=...
```

Deploy:

```bash
fly deploy
```

Fly will build the image, push it, run the health check, and route
traffic at `https://kanban-elevate.fly.dev`.

Smoke test:

```bash
curl https://kanban-elevate.fly.dev/api/health
# {"ok":true,"env":"production"}
```

> The Fly machine boots SQLite at `/data/elevate.db` and local uploads at
> `/data/uploads` on the persistent volume. Restart and redeploy are safe;
> do not run multiple backend machines against the same single volume.

Set up Fly volume snapshots and copy periodic SQLite backups off the Fly
volume. A volume snapshot protects against a bad deploy; an off-volume
backup protects against region, account, or operator failure.

---

## 4. Deploy the frontend to Vercel

1. Vercel → **Add new project** → import your GitHub repo.
2. **Root directory**: `frontend`.
3. **Framework preset**: Vite (auto-detected).
4. **Environment variables**:

   | Name             | Value                                  |
   | ---------------- | -------------------------------------- |
   | `VITE_API_BASE`  | `https://kanban-elevate.fly.dev/api/v1` |

5. Deploy.

Update OAuth callback URLs in Google / GitHub consoles to point at the
Fly URL: `https://kanban-elevate.fly.dev/api/v1/auth/oauth/<provider>/callback`.

---

## 5. (Optional) Deploy the marketing site

Same flow as the frontend, second Vercel project:

1. Root directory: `website`.
2. Env vars:

   | Name              | Value                                       |
   | ----------------- | ------------------------------------------- |
   | `VITE_APP_URL`    | `https://elevate.vercel.app` (the app)      |
   | `VITE_DOCS_URL`   | `https://kanban-elevate.fly.dev/api/docs`   |

3. Deploy. Point the apex domain (e.g. `elevate.com`) at this project,
   and a subdomain (e.g. `app.elevate.com`) at the app frontend.

---

## 6. Verify the deploy

After all three are live:

- `https://kanban-elevate.fly.dev/api/health` → `{ ok: true }`
- `https://kanban-elevate.fly.dev/api/docs` → docs portal loads
- `https://elevate.vercel.app/` → login page renders
- Sign in, create a workspace, upload an avatar.
  - The avatar URL the API returns should be `/api/v1/avatars/...`
  - Open it. The image bytes stream through the backend.
  - With the default local storage backend, files land under
    `/data/uploads` on the Fly volume.
  - With optional Supabase Storage, check **Supabase → Storage → elevate
    bucket** for `avatars/<userId>/<uuid>.png`.

---

## 7. Rotating secrets

Fly secrets can be rotated without downtime:

```bash
# Generate a new JWT secret (logs everyone out — by design)
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")"
```

If you use optional Supabase Storage, service-role keys can be rotated
from **Project Settings → API → Reset service role key**, then updated
with `fly secrets set`.

---

## 8. When you're ready to migrate the database to Postgres

The Postgres schema is already in `database/supabase/schema.sql`. The
runtime cutover requires rewriting the query layer in `backend/src/services/`
to use `pg` or `postgres.js` instead of `better-sqlite3`, then setting
`DATABASE_URL`. Plan a maintenance window: ~half a day of work + manual
smoke. Until then, SQLite on the Fly volume is the source of truth even
if Supabase Storage is used for upload bytes.
