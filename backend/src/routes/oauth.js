/**
 * OAuth routes — `start` and `callback` for each provider.
 *
 * Flow (GitHub / Google share the same shape):
 *   1. Browser hits /auth/oauth/:provider/start (we 302 to the provider)
 *   2. User consents on the provider's page
 *   3. Provider redirects to /auth/oauth/:provider/callback?code=...&state=...
 *   4. We exchange the code for a token, fetch the profile, find/create
 *      the user row, mint a JWT, and 302 back to the frontend with
 *      `#token=...` in the hash so the SPA picks it up.
 *
 * The frontend's /oauth/callback page reads the hash, persists the token,
 * fetches /auth/me, and routes into /workspace.
 */

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import db from '../db.js';
import { FRONTEND_URLS, IS_PROD, PUBLIC_API_URL } from '../config.js';
import { auditLog } from '../middleware/audit.js';
import { findOrCreateOAuthUser, getUserById } from '../services/authService.js';
import { establishSession, exchangeAccessToken } from '../services/refreshTokenService.js';
import { getProvider, listConfiguredProviders, signState, verifyState } from '../services/oauthService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { User, errorResponse, jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/auth');
const OAUTH_COOKIE = 'elevate_oauth_nonce';

const ProviderParam = z.object({
  provider: z.enum(['google', 'github']),
});

const ProvidersResponse = z.object({
  providers: z.array(z.object({ id: z.string(), name: z.string() })),
});

const OAuthExchangeBody = z.object({
  token: z.string().min(1),
});

const OAuthExchangeSuccess = z.object({
  user: User,
  token: z.string().openapi({ example: 'eyJhbGciOiJIUzI1NiIs...' }),
  csrfToken: z.string().openapi({ example: 'dGVzdC1jc3JmLXRva2Vu' }),
});

// Where to bounce the user after a successful login. We default to the
// first configured frontend URL, falling back to the same origin if env
// is misconfigured. Callers can also pass `?redirect=/path` on /start.
function frontendBase() {
  return FRONTEND_URLS[0] || '/';
}

const DEFAULT_NEXT_PATH = '/workspace';
// Dummy origin for path parsing — must match frontend `getSafeOauthNextPath`.
const REDIRECT_URL_BASE = 'https://elevate.local';

function callbackUrl(req, providerId) {
  const path = `/api/v1/auth/oauth/${providerId}/callback`;

  if (IS_PROD && PUBLIC_API_URL) {
    try {
      const base = new URL(PUBLIC_API_URL);
      return `${base.origin}${path}`;
    } catch {
      // fall through to request-derived origin
    }
  }

  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}${path}`;
}

function safeRedirectPath(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return DEFAULT_NEXT_PATH;
  }

  let parsed;
  try {
    parsed = new URL(raw, REDIRECT_URL_BASE);
  } catch {
    return DEFAULT_NEXT_PATH;
  }

  if (parsed.origin !== REDIRECT_URL_BASE) return DEFAULT_NEXT_PATH;
  if (parsed.pathname !== '/workspace' && !parsed.pathname.startsWith('/workspace/')) {
    return DEFAULT_NEXT_PATH;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [key, ...rest] = trimmed.split('=');
    try {
      cookies[key] = decodeURIComponent(rest.join('='));
    } catch {
      cookies[key] = rest.join('=');
    }
  }
  return cookies;
}

function setOauthNonceCookie(res, nonce) {
  res.cookie(OAUTH_COOKIE, nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    maxAge: 10 * 60 * 1000,
    path: '/api/v1/auth/oauth',
  });
}

function clearOauthNonceCookie(res) {
  res.clearCookie(OAUTH_COOKIE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PROD,
    path: '/api/v1/auth/oauth',
  });
}

// ─── Public list endpoint ───────────────────────────────────────────────────

defineRoute(
  router,
  {
    method: 'get',
    path: '/oauth/providers',
    tag: 'Auth',
    summary: 'List configured OAuth providers',
    description: 'The frontend uses this to render only the buttons that are actually wired up via env vars.',
    public: true,
    responses: { 200: jsonContent(ProvidersResponse, 'Configured providers') },
  },
  (_req, res) => {
    res.json({ providers: listConfiguredProviders() });
  }
);

// ─── POST /auth/oauth/exchange ───────────────────────────────────────────────

defineRoute(
  router,
  {
    method: 'post',
    path: '/oauth/exchange',
    tag: 'Auth',
    summary: 'Exchange OAuth access token for session cookies',
    description:
      'Accepts the short-lived access JWT from the OAuth callback URL fragment, verifies it, ensures refresh + CSRF cookies are set on the API origin, and returns `{ user, token, csrfToken }` for cross-origin SPAs.',
    public: true,
    body: OAuthExchangeBody,
    responses: {
      200: jsonContent(OAuthExchangeSuccess, 'Session established'),
      401: errorResponse('Invalid or expired token'),
    },
  },
  (req, res, next) => {
    try {
      const session = exchangeAccessToken(db, req, res, req.body.token);
      const user = getUserById(db, session.userId);
      res.json({ user, token: session.accessToken, csrfToken: session.csrfToken });
    } catch (err) {
      next(err);
    }
  }
);

// ─── /auth/oauth/:provider/start ────────────────────────────────────────────

defineRoute(
  router,
  {
    method: 'get',
    path: '/oauth/:provider/start',
    tag: 'Auth',
    summary: 'Begin OAuth flow',
    description: 'Redirects the browser to the provider consent screen. Pass `?redirect=/some/path` to come back to a specific frontend route after success.',
    public: true,
    params: ProviderParam,
    query: z.object({ redirect: z.string().optional() }),
    responses: {
      302: { description: 'Redirect to provider' },
      404: { description: 'Provider not configured' },
    },
  },
  (req, res) => {
    const provider = getProvider(req.params.provider);
    if (!provider || !provider.configured()) {
      return res.status(404).json({ error: 'Provider not configured', code: 'PROVIDER_DISABLED' });
    }
    const nonce = crypto.randomBytes(16).toString('base64url');
    const state = signState({
      p: provider.id,
      r: safeRedirectPath(req.query.redirect),
      nonce,
    });
    setOauthNonceCookie(res, nonce);
    const redirectUri = callbackUrl(req, provider.id);
    res.redirect(provider.authorizeUrl({ state, redirectUri }));
  }
);

// ─── /auth/oauth/:provider/callback ─────────────────────────────────────────

defineRoute(
  router,
  {
    method: 'get',
    path: '/oauth/:provider/callback',
    tag: 'Auth',
    summary: 'OAuth callback',
    description: 'Provider redirects here after consent. We exchange the code, mint a JWT, and bounce back to the frontend.',
    public: true,
    params: ProviderParam,
    query: z.object({
      code: z.string().optional(),
      state: z.string().optional(),
      error: z.string().optional(),
      error_description: z.string().optional(),
    }),
    responses: { 302: { description: 'Redirect back to frontend' } },
  },
  async (req, res) => {
    const provider = getProvider(req.params.provider);
    const base = frontendBase();
    const fail = (reason) => {
      clearOauthNonceCookie(res);
      auditLog('LOGIN_FAILURE', { provider: req.params.provider, reason });
      const url = new URL('/login', base);
      url.searchParams.set('oauth_error', reason);
      res.redirect(url.toString());
    };

    if (!provider || !provider.configured()) {
      return fail('provider_disabled');
    }
    if (req.query.error) {
      // User cancelled at the consent screen, or provider returned an error.
      return fail(req.query.error_description ? 'denied' : req.query.error);
    }
    if (!req.query.code || !req.query.state) {
      return fail('missing_code');
    }

    const stateBody = verifyState(req.query.state);
    const cookies = parseCookies(req.headers.cookie);
    if (!stateBody || stateBody.p !== provider.id || stateBody.nonce !== cookies[OAUTH_COOKIE]) {
      return fail('invalid_state');
    }
    clearOauthNonceCookie(res);

    let profile;
    try {
      const token = await provider.exchangeCode({
        code: req.query.code,
        redirectUri: callbackUrl(req, provider.id),
      });
      profile = await provider.fetchUser(token);
    } catch (err) {
      console.error(`[oauth:${provider.id}]`, err.message);
      return fail('exchange_failed');
    }

    let result;
    try {
      result = findOrCreateOAuthUser(db, {
        provider: provider.id,
        providerUserId: profile.providerUserId,
        email: profile.email,
        name: profile.name,
        avatar: profile.avatar,
      });
    } catch (err) {
      console.error(`[oauth:${provider.id}] linking failed`, err.message);
      return fail('linking_failed');
    }

    auditLog('LOGIN_SUCCESS', { provider: provider.id, email: profile.email, userId: result.user.id });

    const session = establishSession(db, res, result.user.id);

    // Hand the access token to the SPA via the URL fragment for backward
    // compat. Fragments don't hit server logs; the SPA consumes them on
    // mount. The HttpOnly refresh cookie is the long-lived session.
    const next = safeRedirectPath(stateBody.r);
    const target = new URL('/oauth/callback', base);
    target.hash = `token=${encodeURIComponent(session.accessToken)}&next=${encodeURIComponent(next)}`;
    res.redirect(target.toString());
  }
);

export default router;
