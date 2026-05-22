# Deployment guide

Three things to run in production: the backend, the frontend, and durable
storage for SQLite plus user uploads. Recommended targets:

| Layer    | Where               | Why                                                |
| -------- | ------------------- | -------------------------------------------------- |
| Backend  | **Railway**         | Docker deploy + volume for SQLite/uploads          |
| Database | SQLite on Railway volume | Current backend uses `better-sqlite3`         |
| Uploads  | Railway volume (`/data/uploads`); optional Supabase Storage | Survives redeploys |
| Frontend | Vercel              | Static SPA at `app.arcnvd.com`                     |
| Website  | Vercel (separate)   | Marketing site at `arcnvd.com`                     |

Production URLs used below:

- API + docs: `https://api.arcnvd.com`
- App SPA: `https://app.arcnvd.com`
- Marketing: `https://arcnvd.com`

---

## 0. Prerequisites

- A [Railway](https://railway.com) account (GitHub login).
- A Vercel account (frontend + website).
- The repo pushed to GitHub.
- Optional: Supabase if you use Supabase Storage for uploads.

---

## 1. Optional: prepare Supabase Postgres

The backend still runs on SQLite today. Applying
`database/supabase/schema.sql` only prepares a future Postgres migration;
it does not move the production database until the backend DB layer is
changed to use `DATABASE_URL`.

1. Supabase → **SQL Editor → New query**.
2. Paste `database/supabase/schema.sql` and run (idempotent).

---

## 2. Optional: create a Supabase Storage bucket

See previous Fly guide section — unchanged. Upload bytes only; SQLite stays
on the Railway volume until a Postgres cutover.

---

## 3. Deploy the backend to Railway

The repo ships a **Dockerfile** at the root and **`railway.toml`** for
health checks. Railway builds the same image Fly used.

### 3a. Create the project

1. Railway → **New Project** → **Deploy from GitHub repo** → select this repo.
2. Railway detects `railway.toml` + `Dockerfile`. Root directory = repo root
   (not `backend/`).
3. **Settings → Networking → Generate domain** (e.g. `your-app.up.railway.app`)
   or add custom domain **`api.arcnvd.com`** (CNAME to Railway).

### 3b. Attach a persistent volume (required for SQLite)

1. Service → **Volumes** → **Add volume**.
2. Mount path: **`/data`**
3. Size: start with 1 GB (grow later).

The Dockerfile expects:

```env
DB_PATH=/data/elevate.db
UPLOADS_DIR=/data/uploads
```

Set these as **service variables** (Railway → Variables):

| Variable | Value |
| -------- | ----- |
| `NODE_ENV` | `production` |
| `PORT` | `3001` (Railway also injects `PORT`; either works if health check matches) |
| `DB_PATH` | `/data/elevate.db` |
| `UPLOADS_DIR` | `/data/uploads` |
| `JWT_SECRET` | 48+ random bytes (see below) |
| `FRONTEND_URL` | `https://app.arcnvd.com,https://arcnvd.com` (no leading tabs/spaces) |
| `PUBLIC_API_URL` | `https://api.arcnvd.com` |
| `AUDIT_LOG_ENABLED` | `true` |

Generate JWT secret (prefer **base64url** — no `+` or `/` characters):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

OAuth (if configured):

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

Optional Supabase Storage:

```env
STORAGE_BACKEND=supabase
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey...
SUPABASE_STORAGE_BUCKET=elevate
```

### 3c. Deploy

Push to GitHub (or **Deploy** in Railway). Railway builds the Dockerfile,
mounts `/data`, and runs health checks on `/api/health`.

Smoke test:

```bash
curl https://api.arcnvd.com/api/health
# {"ok":true,"env":"production"}
```

> **Single instance:** Keep **one** Railway replica while SQLite and local
> uploads share one volume. Do not scale to multiple containers on the same DB file.

### 3d. Migrate data from Fly.io (optional)

If you already run on Fly with data in a volume:

```bash
# Download SQLite from Fly (replace app name if different)
fly ssh console -a kanban-elevate -C "cat /data/elevate.db" > elevate.db

# Copy uploads tarball (optional)
fly ssh console -a kanban-elevate -C "tar czf - -C /data uploads" > uploads.tgz
```

Upload to Railway:

1. Install [Railway CLI](https://docs.railway.com/develop/cli).
2. `railway link` to your backend service.
3. Copy DB into the volume (one-off shell or `railway run` with volume mounted):

```bash
railway shell
# inside container with /data mounted:
# paste elevate.db to /data/elevate.db, fix ownership if needed
```

Or use Railway’s volume backup/restore if you prefer their UI.

4. Update DNS: point **`api.arcnvd.com`** CNAME to Railway (remove Fly).
5. Update OAuth provider callback URLs to `https://api.arcnvd.com/api/v1/auth/oauth/.../callback`.
6. Decommission Fly after smoke tests pass.

---

## 4. Deploy the frontend to Vercel

1. Vercel → **Add project** → root directory **`frontend`**.
2. Environment variables:

   | Name             | Value                                  |
   | ---------------- | -------------------------------------- |
   | `VITE_API_BASE`  | `https://api.arcnvd.com/api/v1` |

3. Deploy. Custom domain: **`app.arcnvd.com`**.

`frontend/vercel.json` CSP `connect-src` includes `https://api.arcnvd.com`.

---

## 5. Deploy the marketing site

1. Root directory: **`website`**.
2. Env vars:

   | Name              | Value                                       |
   | ----------------- | ------------------------------------------- |
   | `VITE_SITE_URL`   | `https://arcnvd.com`                        |
   | `VITE_APP_URL`    | `https://app.arcnvd.com`                    |
   | `VITE_DOCS_URL`   | `https://api.arcnvd.com/api/docs`           |

3. Apex domain **`arcnvd.com`** on this project.

---

## 6. Verify the deploy

- `https://api.arcnvd.com/api/health` → `{ ok: true }`
- `https://api.arcnvd.com/api/docs` → docs portal, Try It works (same origin)
- `https://app.arcnvd.com/` → login
- Sign in, create workspace, upload avatar → files under `/data/uploads` on volume

---

## 7. Production security checklist

Before pointing traffic at production, confirm:

| Check | Where | Expected |
| ----- | ----- | -------- |
| `JWT_SECRET` | Railway | 32+ chars, **base64url** preferred; paste raw value (no quotes). If you used standard base64 with `+`, verify the stored value still contains `+` (not spaces). |
| `FRONTEND_URL` | Railway | `https://app.arcnvd.com,https://arcnvd.com` — **no leading tab/space** before the first URL |
| `PUBLIC_API_URL` | Railway | `https://api.arcnvd.com` (API host, not the Vercel SPA host) |
| `VITE_API_BASE` | Vercel (frontend) | `https://api.arcnvd.com/api/v1` |
| HSTS preload | Vercel `vercel.json` + Railway Helmet | `max-age=31536000; includeSubDomains; preload` |
| OAuth callbacks | Google/GitHub console | `https://api.arcnvd.com/api/v1/auth/oauth/google/callback` (and `/github/callback`) |
| Volume mount | Railway | `/data` with `DB_PATH=/data/elevate.db`, `UPLOADS_DIR=/data/uploads` |
| Single replica | Railway | One container while on SQLite (no shared WAL across replicas) |

**Fix common Railway env mistakes** (Railway CLI linked to the backend service):

```bash
# Re-set FRONTEND_URL without a leading tab
railway variables set FRONTEND_URL="https://app.arcnvd.com,https://arcnvd.com"

# Pin OAuth/docs to the API host
railway variables set PUBLIC_API_URL="https://api.arcnvd.com"

# Regenerate JWT secret (logs everyone out) — base64url avoids +/ issues
railway variables set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
```

After changing variables, redeploy the Railway service and verify CORS from the browser console on `https://app.arcnvd.com` (no `CORS: origin ... not allowed` on API calls).

---

## 8. Rotating secrets

Railway → service → **Variables** → update `JWT_SECRET` (logs everyone out).

---

## 9. Legacy: Fly.io

`fly.toml` remains in the repo for reference. New deploys should use Railway.
Do not run Fly and Railway against the same production DB simultaneously.

---

## 10. Postgres migration (future)

Unchanged — see `database/supabase/schema.sql` and `docs/SECURITY.md`.
