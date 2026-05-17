/**
 * OAuth round-trip landing page.
 *
 * The backend redirects here after a successful provider login with the
 * JWT in the URL fragment (`#token=...&next=/workspace`). We:
 *   1. Parse the fragment.
 *   2. Persist the token + a refreshed user via /auth/me.
 *   3. Strip the fragment from history (so a back-tap doesn't re-process).
 *   4. Replace-navigate to `next` (or `/workspace` by default).
 *
 * Failures (no token, bad token) bounce back to /?oauth_error=... so the
 * login page can show a friendly banner.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../api/client.js';
import { Logo } from '../../ui';
import './css/oauth-callback.css';

const TOKEN_KEY = 'Elevate-token';
const STORAGE_KEY = 'Elevate-auth';

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#/, '');
  if (!raw) return {};
  const out = {};
  for (const piece of raw.split('&')) {
    const [k, v] = piece.split('=', 2);
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  return out;
}

export default function OauthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const { token, next } = parseHash();
    // Clear the fragment so refresh / back-button don't re-run this.
    if (window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!token) {
      navigate('/?oauth_error=missing_token', { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        const me = await apiFetch('/auth/me');
        if (cancelled) return;
        if (me?.user) localStorage.setItem(STORAGE_KEY, JSON.stringify(me.user));
        sessionStorage.setItem('Elevate-welcome', '1');
        navigate(next || '/workspace', { replace: true });
      } catch (err) {
        if (cancelled) return;
        // Token was bad / network down — clear and bounce to login.
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(STORAGE_KEY);
        setError(err?.message || 'Sign-in failed');
        const target = `/?oauth_error=${encodeURIComponent('session_failed')}`;
        setTimeout(() => navigate(target, { replace: true }), 800);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main className="oauth-callback">
      <div className="oauth-callback-card">
        <div className="oauth-callback-icon">
          <Logo size={32} />
        </div>
        <h1>Signing you in…</h1>
        <p>{error || 'Hang tight while we complete the handshake.'}</p>
        <div className="oauth-callback-spinner" aria-hidden="true" />
      </div>
    </main>
  );
}
