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
 * Failures (no token, bad token) bounce back to /login?oauth_error=... so the
 * login page can show a friendly banner.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../api/client.js';
import { applyAuthSession } from '../../../hooks/useAuth.js';
import { Logo } from '../../ui';
import { parseOauthFragment } from '../../../utils/oauth.js';
import { LOGIN_PATH } from '../../../config/urls.js';
import './css/oauth-callback.css';

export default function OauthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const { token, next } = parseOauthFragment();
    // Strip the fragment immediately so refresh / back / Referer never retain it.
    if (window.history.replaceState) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }

    if (!token) {
      navigate(`${LOGIN_PATH}?oauth_error=missing_token`, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        applyAuthSession(null, { token });
        const me = await apiFetch('/auth/me');
        if (cancelled) return;
        applyAuthSession(me?.user);
        sessionStorage.setItem('Elevate-welcome', '1');
        navigate(next, { replace: true });
      } catch {
        if (cancelled) return;
        applyAuthSession(null);
        setError('Sign-in failed');
        setTimeout(() => navigate(`${LOGIN_PATH}?oauth_error=session_failed`, { replace: true }), 800);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <main className="oauth-callback">
      <div className="oauth-callback-card">
        <div className="oauth-callback-icon">
          <Logo variant="wordmark" className="oauth-callback-wordmark" />
        </div>
        <h1>Signing you in…</h1>
        <p>{error || 'Hang tight while we complete the handshake.'}</p>
        <div className="oauth-callback-spinner" aria-hidden="true" />
      </div>
    </main>
  );
}
