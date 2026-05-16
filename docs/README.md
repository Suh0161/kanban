# Jokel API Documentation

Static documentation portal for the Jokel REST API. Served by the backend under `/api/docs`.

## Structure

```
docs/
├── index.html                    # Overview / landing
├── reference.html                # Custom OpenAPI renderer (no Scalar)
├── guides/
│   ├── quickstart.html
│   ├── authentication.html
│   └── webhooks.html
├── assets/
│   ├── style.css                 # Shared stylesheet
│   ├── docs.js                   # Shared JS (copy buttons, scroll-spy)
│   ├── reference.js              # OpenAPI renderer (fetches /api/spec)
│   └── hero.png                  # Hero background (pixel art)
├── openapi.json                  # Generated artifact (committed)
└── README.md
```

## OpenAPI source of truth

`docs/openapi.json` is **generated from code**, not edited by hand.

The single source of truth is the Zod schema next to each route in
`backend/src/routes/`. Each route registers itself on the OpenAPI
registry via `defineRoute()` (see `backend/src/openapi/route.js`),
which gives you runtime request validation and the spec entry in
one call.

### Workflow

When you add or change a route:

```bash
cd backend
npm run dev                    # auto-regenerates docs/openapi.json on startup
# or, one-shot:
npm run openapi:generate
```

Commit the resulting `docs/openapi.json` so PRs show the API surface diff.

CI verifies the committed file matches what the code would generate:

```bash
npm run openapi:check          # exits non-zero if out of sync
```

This is the same pattern PyTorch, GitHub, Stripe, etc. use: the spec
is a build artifact that lives in the repo, and CI fails any PR that
forgot to regenerate it.

## Routes

| Path | File |
| --- | --- |
| `GET /api/docs` | `index.html` |
| `GET /api/docs/reference` | `reference.html` |
| `GET /api/docs/guides/quickstart` | `guides/quickstart.html` |
| `GET /api/docs/guides/authentication` | `guides/authentication.html` |
| `GET /api/docs/guides/webhooks` | `guides/webhooks.html` |
| `GET /api/docs/assets/...` | static asset passthrough |
| `GET /api/spec` | live OpenAPI document (built from registry) |

The reference page calls `fetch('/api/spec')` on load and renders
operation cards from the JSON. No external dependencies.

## Local preview

Start the backend, then open <http://localhost:3001/api/docs>.

## Conventions

- All visuals come from CSS variables in `assets/style.css`. No hardcoded colors.
- Each page uses the same shared header but different layouts:
  - **Overview:** `page-single` — no sidebar, hero + cards.
  - **Guides:** `page-with-sidebar` — sidebar with the guide list and per-page sub-section scroll-spy.
  - **API Reference:** `page-with-sidebar` — sidebar built dynamically from the spec, content cards rendered by `reference.js`.
- Code blocks use a thin token-based highlighter (`tk-cmd`, `tk-flag`, `tk-str`, `tk-key`, etc.) with copy buttons wired up in `assets/docs.js`.
