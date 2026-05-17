# Elevate Website

> TBD — marketing site content and copy are not finalised yet.

## Stack

- React 19, Vite, React Router v7, plain CSS
- No Tailwind, no CSS-in-JS, no component library
- Same design tokens as the app (`src/styles/variables.css`)

## Commands

```bash
cd website
npm install
npm run dev      # http://localhost:5174 (Vite picks the next free port)
npm run lint
npm run build    # output in dist/
npm run preview
```

## Structure

```
website/
├── public/
│   └── favicon.svg          # Elevate logo mark
├── src/
│   ├── App.jsx              # Router + layout shell
│   ├── main.jsx             # React entry
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx   # Fixed top nav with mobile drawer
│   │   │   └── Footer.jsx   # Multi-column footer
│   │   └── ui/
│   │       └── Logo.jsx     # Inline SVG logo (gradient-safe)
│   ├── pages/
│   │   ├── home/            # HomePage + Hero, Features, HowItWorks, CTA
│   │   ├── pricing/         # PricingPage (stub)
│   │   ├── changelog/       # ChangelogPage (stub)
│   │   ├── legal/           # PrivacyPage, TermsPage (stubs)
│   │   └── not-found/       # 404
│   └── styles/
│       ├── variables.css    # Design tokens (mirrors app variables)
│       ├── reset.css        # Box-sizing, base resets
│       └── index.css        # Utilities, buttons, section helpers
├── .env.example             # VITE_APP_URL, VITE_DOCS_URL
├── vercel.json              # Security headers + SPA rewrite
└── vite.config.js
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable        | Purpose                                      | Default                          |
| --------------- | -------------------------------------------- | -------------------------------- |
| `VITE_APP_URL`  | URL of the deployed Elevate app              | `http://localhost:5173`          |
| `VITE_DOCS_URL` | URL of the API docs portal                   | `http://localhost:3001/api/docs` |

## Deployment

Deploy to Vercel as a separate project pointing at the `website/` subdirectory. The `vercel.json` ships the same security headers as the app frontend.

## Adding a new page

1. Create `src/pages/<slug>/<PageName>Page.jsx`.
2. Add a lazy import and `<Route>` in `App.jsx`.
3. Add a link in `Navbar.jsx` and `Footer.jsx`.
4. Run `npm run lint && npm run build`.
