# syntax=docker/dockerfile:1.7
#
# Elevate backend container.
#
# Built from the REPO ROOT (Railway, Fly legacy, or local `docker build`).
#
# Two-stage build:
#   1. `build` — installs prod deps with the toolchain needed to compile
#      better-sqlite3's native binding.
#   2. `runtime` — Alpine + Node + tini, no toolchain, non-root user.

# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app/backend

# better-sqlite3 needs python3 + make + g++ to compile its native module.
RUN apk add --no-cache python3 make g++ \
  && ln -sf python3 /usr/bin/python

# Cache layer: deps install whenever package*.json change.
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Non-root user owns the writable volume mount.
RUN addgroup -S app && adduser -S app -G app

# tini reaps zombies and handles SIGINT/SIGTERM cleanly so Fly can drain
# in-flight requests during deploys.
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/elevate.db \
    AUDIT_LOG_ENABLED=true

# Production deps + app source.
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY backend/package.json backend/package-lock.json ./backend/
COPY backend/src ./backend/src

# Schema needs to be reachable from backend/src/db.js's relative path
# (../../database/schema.sql when the cwd is /app/backend).
COPY database/schema.sql ./database/schema.sql

# The /api/docs portal serves the static files in /docs (HTML pages,
# OpenAPI spec, assets). The route in backend/src/routes/docs.js resolves
# them relative to backend/, so the layout has to mirror the dev tree.
COPY docs ./docs

# Volume mount target. Railway / Fly mount a persistent volume here at runtime.
RUN mkdir -p /data && chown -R app:app /data /app

USER app
WORKDIR /app/backend

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
