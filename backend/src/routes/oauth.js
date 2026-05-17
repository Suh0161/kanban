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
import { FRONTEND_URLS, IS_PROD } from '../config.js';
import { auditLog } from '../middleware/audit.js';
import { findOrCreateOAuthUser } from '../services/authService.js';
import { getProvider, listConfiguredProviders, signState, verifyState } from '../services/oauthService.js';
import { defineRoute, withPrefix } from '../openapi/route.js';
import { jsonContent } from '../openapi/schemas.js';

const router = withPrefix(Router(), '/auth');
const OAUTH_COOKIE = 'elevate_oauth_nonce';

const ProviderParam = z.object({
  provider: z.enum(['google', 'github']),
});

const ProvidersResponse = z.object({
  providers: z.array(z.object({ id: z.string(), name: z.string() })),
});

// Where to bounce the user after a successful login. We default to the
// first configured frontend URL, falling back to the same origin if env
// is misconfigured. Callers can also pass `?redirect=/path` on /start.
function frontendBase() {
  return FRONTEND_URLS[0] || '/';
}

function callbackUrl(req, providerId) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/api/v1/auth/oauth/${providerId}/callback`;
}

function safeRedirectPath(value) {
  // Only allow same-origin paths. Reject absolute URLs / protocol-relative.
  if (typeof value !== 'string') return '/workspace';
  if (!value.startsWith('/') || value.startsWith('//')) return '/workspace';
  return value;
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
      const url = new URL('/', base);
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

    // Hand the token to the SPA via the URL fragment. Fragments don't hit
    // server logs, the browser strips them on next nav, and the SPA's
    // /oauth/callback page consumes + clears them on mount.
    const next = safeRedirectPath(stateBody.r);
    const target = new URL('/oauth/callback', base);
    target.hash = `token=${encodeURIComponent(result.token)}&next=${encodeURIComponent(next)}`;
    res.redirect(target.toString());
  }
);

export default router;
