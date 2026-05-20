# Elevate Website

Marketing site for Elevate — home, pricing, try demo, changelog, and legal pages.

## Stack

- React 19, Vite, React Router v7, plain CSS
- No Tailwind, no CSS-in-JS, no component library
- Same design tokens as the app (`src/styles/variables.css`)

## Commands

```bash
cd website
npm install
npm run dev      # http://localhost:5174 (strictPort in vite.config.js)
npm run lint
npm run build    # output in dist/
npm run preview
```

## Structure

```
website/
├── public/                  # Static assets (illustrations, robots.txt, og-image)
├── src/
│   ├── App.jsx              # Router + layout shell
│   ├── main.jsx             # React entry
│   ├── components/
│   │   ├── layout/          # Navbar, Footer
│   │   └── ui/              # Logo
│   ├── pages/               # home, pricing, try, changelog, legal, not-found
│   ├── config/urls.js       # VITE_* URL helpers
│   └── styles/              # variables, reset, index
├── .env.example             # VITE_SITE_URL, VITE_APP_URL, VITE_DOCS_URL
├── vercel.json              # Security headers + SPA rewrite
└── vite.config.js
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable         | Purpose                                      | Default (dev)                    |
| ---------------- | -------------------------------------------- | -------------------------------- |
| `VITE_SITE_URL`  | Marketing site origin (legal, canonical)     | `http://localhost:5174`          |
| `VITE_APP_URL`   | URL of the deployed Elevate app              | `http://localhost:5173`          |
| `VITE_DOCS_URL`  | URL of the API docs portal                   | `http://localhost:3001/api/docs` |

## Deployment

Deploy to Vercel as a separate project pointing at the `website/` subdirectory. The `vercel.json` ships the same security headers as the app frontend. Set `VITE_SITE_URL` to the apex domain (e.g. `https://elevate.com`).

CI runs `npm ci`, `npm run lint`, and `npm run build` on changes under `website/` (see `.github/workflows/website.yml`).

## Adding a new page

1. Create `src/pages/<slug>/<PageName>Page.jsx`.
2. Add a lazy import and `<Route>` in `App.jsx`.
3. Add a link in `Navbar.jsx` and `Footer.jsx`.
4. Run `npm run lint && npm run build`.
