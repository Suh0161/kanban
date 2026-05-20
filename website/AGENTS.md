# AGENTS.md (website)

> Rules for AI agents working inside `website/`. **This file overrides the
> top-level `AGENTS.md` for anything inside this folder.**

## Persona

You are a frontend engineer working on the Elevate **marketing site** — a
static React SPA for home, pricing, the interactive `/try` demo, changelog,
and legal pages. You write clean, minimal diffs, match existing page
patterns, and keep the site deploy-safe (env validation, CSP, no secrets).
The marketing site does **not** call the Elevate API at runtime; sign-in
hands off to the app at `VITE_APP_URL`.

## Stack

| Layer   | Tech |
| ------- | ---- |
| UI      | React 19, Vite 8, React Router v7 |
| CSS     | Plain CSS only — **no Tailwind, no CSS-in-JS** |
| Icons   | `lucide-react` |
| `/try`  | `@hello-pangea/dnd` (demo board only, local mock data) |
| Theme   | `data-theme` + `localStorage` key `elevate-website-theme` |
| Deploy  | Vercel (`vercel.json` — SPA rewrite + security headers) |

Node **20+** (`engines` in `package.json`).

## Commands

```bash
cd website
npm install
npm run dev      # http://localhost:5174 (strictPort: true)
npm run lint     # eslint
npm run build    # production build — always run before finishing
npm run preview
```

CI (`.github/workflows/website.yml`) runs `npm ci`, lint, and build on
changes under `website/`.

## Environment variables

Copy `.env.example` to `.env` for production builds. **Local dev** uses
`.env.development` (committed) for localhost origins; production URLs in
`.env` are ignored at runtime in dev unless you set explicit
`http://localhost:*` overrides in `.env.development.local`.

| Variable         | Purpose |
| ---------------- | ------- |
| `VITE_SITE_URL`  | Marketing origin (canonical, legal copy) |
| `VITE_APP_URL`   | App SPA (Sign in → `{APP_URL}/login?fresh=1`) |
| `VITE_DOCS_URL`  | API docs portal links |

All `VITE_*` values are **public** (baked into the client bundle). Never
put secrets here. Runtime helpers live in `src/config/urls.js`; use
`LOGIN_URL`, `getAppUrl()`, `DOCS_URL` — do not hardcode origins in pages.

## Project structure

```
website/
├── public/                    # Static assets, theme-boot.js, robots.txt, og-image.png
├── src/
│   ├── App.jsx                # Router + Navbar/Footer shell, lazy routes
│   ├── main.jsx               # React entry + initTheme()
│   ├── config/
│   │   ├── urls.js            # VITE_* helpers, LOGIN_URL, getAppUrl()
│   │   └── nav.js             # TRY_PATH, nav link constants
│   ├── components/
│   │   ├── layout/            # Navbar, Footer (+ css/)
│   │   └── ui/                # Logo
│   ├── hooks/
│   │   └── useTheme.js        # Light/dark toggle (site chrome only)
│   ├── pages/
│   │   ├── home/              # Hero, Features, CTA, ApiSandbox
│   │   ├── try/               # Interactive demo (see below)
│   │   ├── pricing/
│   │   ├── changelog/
│   │   ├── legal/             # Privacy, Terms (+ LegalShell)
│   │   ├── app-login/         # /login → fixed redirect to app
│   │   ├── not-found/
│   │   └── shared/            # secondary.css (legal/pricing rhythm)
│   ├── styles/                # variables.css, reset.css, index.css (global only)
│   └── theme/                 # theme.js, theme.css, initTheme.js
├── vite/
│   └── validateElevateEnv.js  # Production build guard
├── index.html                 # SEO/OG meta; %VITE_SITE_URL% placeholders
├── vercel.json                # Headers + SPA rewrite
└── vite.config.js
```

## Routing

```
/              → HomePage
/features      → redirect to /try
/try           → TryPage (interactive demo)
/pricing       → PricingPage
/changelog     → ChangelogPage
/privacy       → PrivacyPage
/terms         → TermsPage
/login         → AppLoginRedirect (fixed handoff to app LOGIN_URL)
*              → NotFoundPage
```

Nav links: `src/config/nav.js` + `Navbar.jsx` / `Footer.jsx`.

## Page feature folders

Mirror the app frontend pattern where it helps:

```
pages/<feature>/
├── <Feature>Page.jsx
├── components/          # optional
│   ├── index.js
│   └── …
├── css/                 # page-specific styles
│   └── <feature>.css
└── index.js             # barrel export for lazy routes
```

- **Global styles** → `src/styles/` only (tokens, reset, shell).
- **Page CSS** → imported by the page or feature root component, never
  moved back into `src/styles/`.
- Class naming: lowercase, hyphenated, feature-prefixed (`.try-search`,
  `.home-hero`, `.wl-*` is app-only — use `.try-*`, `.home-*` here).

## Styling

- Colors from `src/styles/variables.css` — **never hardcode hex colors**.
- Light + dark themes via `[data-theme='light']` overrides in feature CSS
  where needed.
- Google Fonts (Noto Sans JP, Press Start 2P) loaded in `index.html`;
  disclose in legal copy if privacy pages change.

## `/try` interactive demo

Local-only Kanban preview — **no API, no persistence**.

| Piece | Role |
| ----- | ---- |
| `mockData.js` | Static board seed |
| `useDemoBoard.js` | State, drag-drop, column collapse, search filter |
| `TryPage.jsx` | Lifts hook state; wires `TryProductFrame` + `DemoBoard` |
| `TryProductFrame.jsx` | Product monitor shell, sidebar toggle, search input |
| `DemoBoard` / `DemoColumn` / `DemoCard` | Canvas + DnD |
| `TryDragBoundsContext.jsx` | Clamps drag position inside `.try-device-shell` |

Rules:

- Drag-drop **disabled while search is active** (matches app behavior).
- Do **not** put `transform` / 3D tilt on DnD ancestors — breaks drag or
  causes cards to escape the frame.
- Shell uses `overflow: hidden` + grid so sidebar toggle does not resize
  the monitor; board scrolls horizontally inside the frame.
- `@hello-pangea/dnd` uses `position: fixed` while dragging; bounds are
  clamped in JS, not only via CSS overflow.

## Auth handoff

- All marketing **Sign in** / **Get started** links use `LOGIN_URL` from
  `urls.js` (`/login?fresh=1` on the app) so cached JWTs are cleared.
- `AppLoginRedirect` uses `window.location.assign(LOGIN_URL)` — **no
  user-controlled redirect** query params.
- `getAppUrl()` only accepts safe relative paths (`SAFE_RELATIVE_PATH`).

Keep `APP_LOGIN_PATH` and `LOGIN_FRESH_PARAM` in sync with
`frontend/src/config/urls.js`.

## Security & production

- **No secrets** in source; no runtime `fetch` to the API (except static
  copy in `ApiSandbox.jsx`).
- **CSP** in `vercel.json`: `script-src 'self'` — boot logic lives in
  `public/theme-boot.js`, not inline in `index.html`.
- External links with `target="_blank"` must include
  `rel="noopener noreferrer"`.
- Production **must** set `VITE_*` HTTPS origins in Vercel; misconfigured
  builds send users to wrong login hosts.
- Do not commit `dist/` — Vercel builds from source.

## Metadata

Single `index.html` title/description/OG tags for the SPA (no per-route
meta yet). Keep copy professional and product-focused; avoid theme
marketing ("dark-themed") in SEO strings. `%VITE_SITE_URL%` in HTML is
resolved at build time for canonical/OG image URLs.

## Adding a new page

1. Create `src/pages/<slug>/<Name>Page.jsx` (+ `css/` if needed).
2. Export from `pages/<slug>/index.js`.
3. Lazy import + `<Route>` in `App.jsx`.
4. Link in `Navbar.jsx`, `Footer.jsx`, and `config/nav.js` if applicable.
5. Run `npm run lint && npm run build`.

## Boundaries

- Always run `npm run lint` and `npm run build` before finishing.
- **Do not** add backend routes or change `docs/openapi.json` from here.
- Ask before adding npm packages or changing `vite.config.js` / routing
  strategy.
- Do not commit `.env` or `dist/`.
- Legal/email domains: use `@arcnvd.com` consistently (see legal pages).

## Common pitfalls

- **Port 5174 in use:** `strictPort: true` — stop the other Vite process
  before starting website dev (start app on 5173 first if both run).
- **CSP + inline scripts:** any new boot script must be external or get a
  CSP hash in `vercel.json`.
- **Try frame centering:** keep `max-width` + `minmax(0, 1fr)` on shell
  grid; avoid `overflow: visible` on the device shell chain.
- **Feature CSS drift:** never put page CSS in `src/styles/` (no
  `styles/views/`).
- **Build without env:** production `npm run build` fails without
  `.env` — copy from `.env.example` locally and set vars in Vercel CI.

## Further reading

- Setup: [`README.md`](./README.md)
- Workspace rules: [`../AGENTS.md`](../AGENTS.md)
- Deploy + security headers: [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md),
  [`../docs/SECURITY.md`](../docs/SECURITY.md)
