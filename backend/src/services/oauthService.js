/**
 * OAuth 2.0 Authorization Code flow for Google + GitHub.
 *
 * Each provider exposes:
 *   - id          : url slug we accept on /auth/oauth/:provider/start|callback
 *   - clientId    : public app id (from env)
 *   - clientSecret: kept server-side only (from env)
 *   - configured(): whether env vars are present so we can hide the button
 *                   on the frontend instead of failing mid-flow
 *   - authorizeUrl({ state, redirectUri })
 *       returns the URL the user is redirected to to consent
 *   - exchangeCode({ code, redirectUri })
 *       trades the temporary code for an access token
 *   - fetchUser(accessToken)
 *       returns a normalized profile { providerUserId, email, name, avatar }
 *
 * Adding another provider later (Microsoft, Apple, GitLab) is just one
 * more entry in the PROVIDERS map.
 *
 * State is HMAC-signed so we don't need a session store; it carries
 * a nonce + an optional `redirect` for "go here after login".
 */

import crypto from 'crypto';
import { JWT_SECRET } from '../config.js';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for the consent screen
const STATE_SECRET = `oauth.state.v1:${JWT_SECRET}`;

/**
 * Sign a small payload as `<base64url(json)>.<hmac>`. We carry an issuance
 * timestamp + nonce + optional redirect path. HMAC binds them so a client
 * can't tamper with the state we'll later trust.
 */
export function signState(payload) {
  const body = { ...payload, iat: Date.now(), nonce: payload.nonce || crypto.randomBytes(16).toString('base64url') };
  const json = JSON.stringify(body);
  const enc = Buffer.from(json, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(enc).digest('base64url');
  return `${enc}.${sig}`;
}

export function verifyState(state) {
  if (typeof state !== 'string' || !state.includes('.')) return null;
  const [enc, sig] = state.split('.', 2);
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(enc).digest('base64url');
  // timingSafeEqual requires equal-length buffers
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let body;
  try { body = JSON.parse(Buffer.from(enc, 'base64url').toString('utf8')); } catch { return null; }
  if (!body || typeof body.iat !== 'number') return null;
  if (Date.now() - body.iat > STATE_TTL_MS) return null;
  return body;
}

// ─── Provider definitions ────────────────────────────────────────────────────

const google = {
  id: 'google',
  name: 'Google',
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  configured() { return !!(this.clientId && this.clientSecret); },

  authorizeUrl({ state, redirectUri }) {
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', this.clientId);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid email profile');
    u.searchParams.set('state', state);
    u.searchParams.set('access_type', 'online');
    u.searchParams.set('prompt', 'select_account');
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    if (!res.ok) throw new Error(`google: token exchange failed (${res.status})`);
    const json = await res.json();
    return json.access_token;
  },

  async fetchUser(accessToken) {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`google: userinfo failed (${res.status})`);
    const u = await res.json();
    if (!u.email) throw new Error('google: userinfo missing email');
    if (u.email_verified === false) throw new Error('google: email not verified');
    return {
      providerUserId: u.sub,
      email: u.email.toLowerCase(),
      name: u.name || u.email.split('@')[0],
      avatar: u.picture || null,
    };
  },
};

const github = {
  id: 'github',
  name: 'GitHub',
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  configured() { return !!(this.clientId && this.clientSecret); },

  authorizeUrl({ state, redirectUri }) {
    const u = new URL('https://github.com/login/oauth/authorize');
    u.searchParams.set('client_id', this.clientId);
    u.searchParams.set('redirect_uri', redirectUri);
    u.searchParams.set('scope', 'read:user user:email');
    u.searchParams.set('state', state);
    return u.toString();
  },

  async exchangeCode({ code, redirectUri }) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`github: token exchange failed (${res.status})`);
    const json = await res.json();
    if (json.error) throw new Error(`github: ${json.error_description || json.error}`);
    return json.access_token;
  },

  async fetchUser(accessToken) {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Elevate-OAuth/1.0',
    };

    const profileRes = await fetch('https://api.github.com/user', { headers });
    if (!profileRes.ok) throw new Error(`github: user failed (${profileRes.status})`);
    const profile = await profileRes.json();

    // Public email may be hidden — fall back to the verified emails list.
    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
      if (emailsRes.ok) {
        const list = await emailsRes.json();
        const primary = Array.isArray(list)
          ? list.find((e) => e.primary && e.verified) || list.find((e) => e.verified)
          : null;
        email = primary?.email || null;
      }
    }
    if (!email) throw new Error('github: no verified email available');

    return {
      providerUserId: String(profile.id),
      email: email.toLowerCase(),
      name: profile.name || profile.login || email.split('@')[0],
      avatar: profile.avatar_url || null,
    };
  },
};

const PROVIDERS = { google, github };

export function getProvider(id) {
  return PROVIDERS[id] || null;
}

/** Public list of providers, configured-only. Used by the frontend. */
export function listConfiguredProviders() {
  return Object.values(PROVIDERS)
    .filter((p) => p.configured())
    .map((p) => ({ id: p.id, name: p.name }));
}
