# Deployment guide

Three things to run in production: the backend, the frontend, and a
storage layer for user uploads. Recommended targets:

| Layer    | Where               | Why                                                |
| -------- | ------------------- | -------------------------------------------------- |
| Backend  | Fly.io              | Persistent volume keeps SQLite alive across deploys |
| Database | Supabase Postgres   | Schema applied now; runtime cutover is a follow-up |
| Storage  | Supabase Storage    | Survives container restarts, free tier, RLS-aware  |
| Frontend | Vercel              | Static SPA, automatic HTTPS, edge CDN              |
| Website  | Vercel (separate)   | Marketing site lives at the apex domain            |

This guide walks through each in the order you want to deploy them.

---

## 0. Prerequisites

- A Supabase project (free tier is fine). Project URL + service-role key
  ready from **Project Settings → API**.
- A Fly.io account and `flyctl` installed locally.
- A Vercel account.
- The repo pushed to GitHub.

---

## 1. Apply the Postgres schema to Supabase

Even though the backend still runs on SQLite today, push the schema now
so the database is provisioned and you can use Supabase Storage right
away.

1. Open your project in Supabase → **SQL Editor → New query**.
2. Paste the contents of `database/supabase/schema.sql`.
3. Run it. The script is idempotent; you can re-run it after schema
   changes without losing data.

Verify in **Table Editor**: you should see `profiles`, `workspaces`,
`workspace_members`, `tasks`, etc.

---

## 2. Create the Storage bucket

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
fly apps create elevate-api
fly volumes create elevate_data --region sin --size 1
```

Set required secrets:

```bash
# Strong JWT secret (48 random bytes, base64).
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")"

# Your deployed frontend origin (comma-separate for multiple).
fly secrets set FRONTEND_URL="https://elevate.vercel.app,https://app.elevate.com"

# Supabase Storage backend.
fly secrets set \
  STORAGE_BACKEND=supabase \
  SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY="ey..." \
  SUPABASE_STORAGE_BUCKET=elevate

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
traffic at `https://elevate-api.fly.dev`.

Smoke test:

```bash
curl https://elevate-api.fly.dev/api/health
# {"ok":true,"env":"production"}
```

> The Fly machine boots SQLite at `/data/elevate.db` (a persistent
> volume). Restart, redeploy, scale up — the DB survives.

---

## 4. Deploy the frontend to Vercel

1. Vercel → **Add new project** → import your GitHub repo.
2. **Root directory**: `frontend`.
3. **Framework preset**: Vite (auto-detected).
4. **Environment variables**:

   | Name             | Value                                  |
   | ---------------- | -------------------------------------- |
   | `VITE_API_BASE`  | `https://elevate-api.fly.dev/api/v1`   |

5. Deploy.

Update OAuth callback URLs in Google / GitHub consoles to point at the
Fly URL: `https://elevate-api.fly.dev/api/v1/auth/oauth/<provider>/callback`.

---

## 5. (Optional) Deploy the marketing site

Same flow as the frontend, second Vercel project:

1. Root directory: `website`.
2. Env vars:

   | Name              | Value                                       |
   | ----------------- | ------------------------------------------- |
   | `VITE_APP_URL`    | `https://elevate.vercel.app` (the app)      |
   | `VITE_DOCS_URL`   | `https://elevate-api.fly.dev/api/docs`      |

3. Deploy. Point the apex domain (e.g. `elevate.com`) at this project,
   and a subdomain (e.g. `app.elevate.com`) at the app frontend.

---

## 6. Verify the deploy

After all three are live:

- `https://elevate-api.fly.dev/api/health` → `{ ok: true }`
- `https://elevate-api.fly.dev/api/docs` → docs portal loads
- `https://elevate.vercel.app/` → login page renders
- Sign in, create a workspace, upload an avatar.
  - The avatar URL the API returns should be `/api/v1/avatars/...`
  - Open it. The image bytes come straight from Supabase Storage
    through the backend's stream proxy.
- Check **Supabase → Storage → elevate bucket** — you should see
  `avatars/<userId>/<uuid>.png` show up.

---

## 7. Rotating secrets

Both Fly and Supabase let you rotate without downtime:

```bash
# Generate a new JWT secret (logs everyone out — by design)
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")"
```

Supabase service-role keys can be rotated from **Project Settings →
API → Reset service role key**, then update with `fly secrets set`.

---

## 8. When you're ready to migrate the database to Postgres

The Postgres schema is already in `database/supabase/schema.sql`. The
runtime cutover requires rewriting the query layer in `backend/src/services/`
to use `pg` or `postgres.js` instead of `better-sqlite3`. Plan a
maintenance window: ~half a day of work + manual smoke. Until then,
SQLite on the Fly volume is the source of truth.
