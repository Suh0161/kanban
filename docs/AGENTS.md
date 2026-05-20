# AGENTS.md

## Persona

You are a documentation engineer working on the Elevate API docs. The docs share Elevate's dark monochrome theme and ship as plain HTML/CSS/JS — no frameworks, no CDNs. The OpenAPI spec is generated from backend code, never hand-written. Keep edits minimal, themed, and consistent with the rest of the app.

## Stack

- Plain HTML, CSS, vanilla JS — no build step
- OpenAPI 3.0 spec generated from backend Zod schemas
- Served by the backend at `/api/docs` (see `backend/src/routes/docs.js`)
- Same fonts as the app: Inter + JetBrains Mono via Google Fonts
- No external runtime dependencies (no Scalar, Redoc, Swagger UI)

## Commands

```bash
cd backend
npm run dev                  # http://localhost:3001/api/docs (auto-regen openapi.json on start)
npm run openapi:generate     # rebuild docs/openapi.json from code
npm run openapi:check        # CI guard: fails if openapi.json is out of sync
```

## Project Structure

```txt
docs/
  index.html             # Overview / landing
  reference.html         # Custom OpenAPI renderer (no Scalar)
  guides/
    quickstart.html
    authentication.html
    webhooks.html
  assets/
    style.css            # Shared stylesheet (light + dark tokens)
    theme-boot.js        # FOUC-free theme init (inline in <head>)
    api-urls.js          # Canonical API base URL helpers (index + reference)
    docs.js              # Theme toggle, copy buttons, scroll-spy
    reference.js         # API reference renderer (fetches /api/spec)
    elevate-v1.svg       # Header wordmark (white paths; invert in light theme)
    elevate.svg          # Icon mark — favicon SVG fallback only, not the header
    elevate-favicon-pixel.png
    elevate-logo-pixel.png  # apple-touch-icon
    hero-dark.png / hero-light.png
    footer-accent-dark.png / footer-accent-light.png
  openapi.json           # Generated artifact, committed to git
  README.md              # Human-facing overview
  AGENTS.md              # This file
```

## OpenAPI Source of Truth

- `docs/openapi.json` is **generated**, never hand-edited.
- Routes register themselves via `defineRoute()` in `backend/src/routes/*.js`. The Zod schema validates the request **and** produces the spec entry.
- `npm run dev` regenerates `openapi.json` on startup. `npm run openapi:check` enforces it in CI.
- The reference page (`reference.html` + `assets/reference.js`) calls `fetch('/api/spec')` and renders the live spec.

## Conventions

### Pages

- Static HTML files. No build step, no templating engine.
- Each page reuses the same `<header>` markup so the nav tabs stay consistent.
- Three layouts:
  - `page-single` — overview only, single column.
  - `page-with-sidebar` — guides + reference. Grid `sidebar-w | 1fr`.
  - The reference page builds its sidebar dynamically from the spec.

### Brand assets

Use the right file for each surface. Brand PNG/SVG sources live in `docs/assets/`.

| Asset | Role | Where used |
| --- | --- | --- |
| `elevate-v1.svg` | Full wordmark (white on transparent) | Header `<img class="brand-logo brand-logo--wordmark">` on every HTML page |
| `elevate.svg` | Icon mark only | Second `<link rel="icon" type="image/svg+xml">` — not in the header |
| `elevate-favicon-pixel.png` | Primary favicon | First `<link rel="icon" type="image/png">` |
| `elevate-logo-pixel.png` | Home-screen icon | `<link rel="apple-touch-icon">` |

Header markup (copy to new pages verbatim):

```html
<link rel="icon" type="image/png" href="/api/docs/assets/elevate-favicon-pixel.png" />
<link rel="icon" type="image/svg+xml" href="/api/docs/assets/elevate.svg" />
<link rel="apple-touch-icon" href="/api/docs/assets/elevate-logo-pixel.png" />
...
<img class="brand-logo brand-logo--wordmark" src="/api/docs/assets/elevate-v1.svg" alt="" width="172" height="19" />
```

Light theme: `elevate-v1.svg` is white-on-transparent. `assets/style.css` applies `filter: invert(1)` to `.brand-logo--wordmark` under `[data-theme='light']` (same pattern as the marketing site). Do not swap in `elevate.svg` for the header.

Register every new asset in `backend/src/routes/docs.js` with an explicit `router.get('/docs/assets/...')` line.

### Styling

- Pixel monochrome theme (dark default + optional light via `data-theme` on `<html>`). Sharp 2px borders, 4px spacing grid, no soft gradients. Tokens live in `assets/style.css`; method/status colors are grayscale aliases.
- Theme persistence: `localStorage` key `elevate-docs-theme` (`light` | `dark`). `assets/theme-boot.js` runs inline in `<head>` before CSS to prevent flash; toggle lives in the header (`docs.js`).
- Never hardcode colors. Use CSS variables in `assets/style.css` (`--accent`, `--text-1`, `--border-strong`, etc.).
- Class naming: component-prefixed, lowercase, hyphenated. Examples: `.op-card`, `.op-section`, `.ref-op-link`, `.prop-row`.
- All styles live in `assets/style.css`. No inline `<style>` blocks beyond a small page-specific tweak in `reference.html`.
- Method pills (`.method-get`, `.method-post`, etc.) and JSON tokens (`.tk-cmd`, `.tk-flag`, `.tk-str`, `.tk-key`) share the same palette.

### Routing

The backend mounts these in `backend/src/routes/docs.js`:

```txt
/api/docs                          -> index.html
/api/docs/reference                -> reference.html
/api/docs/guides/quickstart        -> guides/quickstart.html
/api/docs/guides/authentication    -> guides/authentication.html
/api/docs/guides/webhooks          -> guides/webhooks.html
/api/docs/assets/*                 -> static asset
/api/spec                          -> generated OpenAPI JSON
```

## Adding New Features

### New Guide

1. Create `docs/guides/<slug>.html` (copy an existing guide as template).
2. Add a sidebar entry to **every** existing guide page so navigation stays consistent.
3. Add a `router.get` line in `backend/src/routes/docs.js`.
4. Add a card on `index.html` linking to it.
5. Use `<div class="kicker">Guides</div>` and `<h1 class="page-title">` for the header.

### New Endpoint

1. Edit the relevant route file in `backend/src/routes/*.js`. Define the Zod body/params/query inline or import shared schemas from `backend/src/openapi/schemas.js`.
2. The reference page picks it up automatically. No edits in `docs/`.
3. Run `npm run openapi:generate` (or just `npm run dev`) and commit both the route file and the regenerated `docs/openapi.json`.

### Renderer Tweak

Edit `assets/reference.js`. Common entry points:

- `renderOperation()` — operation card layout
- `renderSchema()` — object/array/oneOf rendering
- `buildCurl()` — example curl snippet
- `buildExample()` — synthesized example JSON
- `highlightJson()` — JSON syntax tokenizer

## Boundaries

- Never hand-edit `docs/openapi.json`. Regenerate from code.
- Never reintroduce Scalar, Redoc, or Swagger UI. Custom renderer stays.
- Never add `unsafe-eval` or external script CDNs to CSP.
- Never hardcode colors in HTML or JS. CSS variables only.
- Never import a frontend framework (React, Vue, Alpine, htmx).
- Never run destructive git commands without explicit approval.
- Light and dark themes are supported; do not remove the toggle or `theme-boot.js` without replacing the flash-free init pattern.
- Ask first before adding any runtime dependency to the docs.

## Engineering Discipline

- The OpenAPI spec is the API contract. Treat it like code: PRs that change routes must include the regenerated `openapi.json`.
- The reference page is rendered client-side. Any change must work in modern Chromium/Firefox/Safari without polyfills.
- Keep CSP strict. The current policy allows only Google Fonts and self-hosted scripts. Anything else is a regression.
- For meaningful changes, include verification notes: lint, `openapi:check`, and a manual smoke test of the affected page.

## Common Pitfalls

- **Drift between spec and code:** Forgetting `npm run openapi:generate` after a route change. CI catches this with `openapi:check`.
- **Cached old spec:** `reference.js` fetches `/api/spec` once at load. Hard-refresh after backend changes.
- **Mojibake when scripting edits:** PowerShell's default encoding can mangle UTF-8. Use UTF-8 without BOM (`System.Text.UTF8Encoding($false)`) when writing files programmatically.
- **Inline styles fighting the stylesheet:** Keep all styling in `assets/style.css`. The only inline block is the layout-specific tweak in `reference.html`.
- **Hero drift:** Theme-specific heroes are `hero-dark.png` and `hero-light.png` (CSS `--hero-image`). Keep both in sync when art changes.
- **Wordmark vs icon:** `elevate.svg` is the bar-chart icon for favicons; the header always uses `elevate-v1.svg`. Never use the icon SVG as the header wordmark.

## Further Reading

- Full setup and architecture: top-level `README.md`
- Frontend conventions (theme/palette rules apply here too): root `AGENTS.md`
- Backend route + OpenAPI pattern: `backend/README.md`
- Renderer entry points: `docs/assets/reference.js`
- Shared schemas: `backend/src/openapi/schemas.js`
