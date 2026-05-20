import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import { useOauthProviders } from '../../../hooks/useOauthProviders.js';
import { apiFetch, getOauthStartUrl } from '../../../api/client.js';
import { Logo } from '../../ui';
import { LOGIN_FRESH_PARAM, SITE_URL } from '../../../config/urls.js';
import './css/login.css';

// SVG Icons for social logins
const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// GitHub "octocat" mark, MIT-licensed.
const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-.99-.02-1.94-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.48 3.14-1.17 3.14-1.17.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.36-5.25 5.65.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.13 0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z"/>
  </svg>
);

const PROVIDER_ICONS = {
  google: GoogleIcon,
  github: GithubIcon,
};

const OAUTH_ERROR_MESSAGES = {
  missing_token:    "We didn't get a session token back. Try again.",
  session_failed:   'Sign-in completed but we couldn\u2019t open your session.',
  invalid_state:    'The sign-in link expired. Start over from this page.',
  missing_code:     'The provider didn\u2019t return a sign-in code.',
  exchange_failed:  'We couldn\u2019t verify your provider account. Try again.',
  linking_failed:   'We couldn\u2019t link your account. Try email + password instead.',
  provider_disabled:'That sign-in method is currently disabled.',
  denied:           'You declined the sign-in. No worries \u2014 try again any time.',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, logout, isLoggedIn, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { providers } = useOauthProviders();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  const [rName, setRName]       = useState('');
  const [rEmail, setREmail]     = useState('');
  const [rPw, setRPw]           = useState('');
  const [showRPw, setShowRPw]   = useState(false);

  // Surface OAuth errors that the backend redirected back with as
  // `?oauth_error=...`. Derived from the URL during render so we don't
  // call setState in an effect; clearing it strips the search param,
  // which removes the message naturally on next render.
  const oauthErrorCode = searchParams.get('oauth_error');
  const oauthErrorMessage = oauthErrorCode
    ? (OAUTH_ERROR_MESSAGES[oauthErrorCode] || 'Sign-in failed. Please try again.')
    : '';
  const visibleError = error || oauthErrorMessage;

  // Marketing sign-in uses ?fresh=1 so a cached JWT does not skip the form.
  useEffect(() => {
    if (searchParams.get(LOGIN_FRESH_PARAM) === '1') {
      logout();
      const next = new URLSearchParams(searchParams);
      next.delete(LOGIN_FRESH_PARAM);
      setSearchParams(next, { replace: true });
      return;
    }
    if (!authLoading && isLoggedIn) {
      navigate('/workspace', { replace: true });
    }
  }, [authLoading, isLoggedIn, logout, navigate, searchParams, setSearchParams]);

  const dismissError = () => {
    setError('');
    if (oauthErrorCode) {
      const next = new URLSearchParams(searchParams);
      next.delete('oauth_error');
      setSearchParams(next, { replace: true });
    }
  };

  const startOauth = (providerId) => {
    // Full-page navigation — the provider needs to redirect us back, so
    // SPA navigation isn't an option here.
    window.location.assign(getOauthStartUrl(providerId, { redirect: '/workspace' }));
  };

  const switchMode = (m) => { setMode(m); dismissError(); };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      sessionStorage.setItem('Elevate-welcome', '1');
      navigate('/workspace');
    } else {
      setError(result.error || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email: rEmail.trim().toLowerCase(), name: rName.trim(), password: rPw }),
      });
      switchMode('login');
      setEmail(rEmail.trim().toLowerCase());
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp-split">
      {/* ── LEFT SIDE SHOWCASE ── */}
      <div className="lp-left">
        <div className="lp-copy">
          <div className="lp-brand-lockup">
            <Logo variant="wordmark" className="lp-brand-wordmark" />
          </div>

          <div className="lp-brand-meta">
            <span className="lp-kana" lang="ja" aria-hidden="true">昇</span>
            <span className="lp-eyebrow">Kanban workspace</span>
          </div>

          <h1 className="lp-headline">Welcome back to Elevate</h1>

          <p className="lp-lead">
            Sign in to continue your journey and achieve more every day.
          </p>
        </div>

        <p className="lp-trust">
          <ShieldCheck size={20} strokeWidth={2} aria-hidden="true" />
          <span>
            Your data is protected
            <br />
            Enterprise-grade security
          </span>
        </p>
      </div>

      {/* ── RIGHT SIDE AUTH ── */}
      <div className="lp-right">
        <div className="lp-glass lp-mobile-brand" aria-label="Elevate">
          <Logo variant="wordmark" className="lp-brand-wordmark" />
        </div>
        <div className="lp-glass lp-auth-box">
          <div className="lp-header-right">
            <h2>{mode === 'login' ? 'Login' : 'Sign up'}</h2>
            <p>{mode === 'login' ? 'Glad to see you again!' : 'Create your free account today.'}</p>
          </div>

          {visibleError && <div className="lp-banner lp-error">{visibleError}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="lp-form">
              <div className="lp-field">
                <label htmlFor="l-email">Email address</label>
                <div className="lp-input-wrap">
                  <Mail size={15} />
                  <input id="l-email" type="email" autoFocus
                    placeholder="Enter your email" value={email}
                    onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <div className="lp-field">
                <label htmlFor="l-pw">Password</label>
                <div className="lp-input-wrap">
                  <Lock size={15} />
                  <input id="l-pw" type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password" value={password}
                    onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="lp-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button type="button" className="lp-ghost-btn">Forgot password?</button>
                </div>
              </div>
              <button type="submit" className="lp-submit" disabled={loading || !email || !password}>
                {loading ? <span className="lp-spinner" /> : 'Login'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="lp-form">
              <div className="lp-field">
                <label htmlFor="r-name">Full name</label>
                <div className="lp-input-wrap">
                  <User size={15} />
                  <input id="r-name" type="text" autoFocus
                    placeholder="Jane Doe" value={rName}
                    onChange={e => setRName(e.target.value)} required />
                </div>
              </div>
              <div className="lp-field">
                <label htmlFor="r-email">Email address</label>
                <div className="lp-input-wrap">
                  <Mail size={15} />
                  <input id="r-email" type="email"
                    placeholder="Enter your email" value={rEmail}
                    onChange={e => setREmail(e.target.value)} required />
                </div>
              </div>
              <div className="lp-field">
                <label htmlFor="r-pw">Password</label>
                <div className="lp-input-wrap">
                  <Lock size={15} />
                  <input id="r-pw" type={showRPw ? 'text' : 'password'}
                    placeholder="Create a strong password" value={rPw}
                    onChange={e => setRPw(e.target.value)} required />
                  <button type="button" className="lp-eye" onClick={() => setShowRPw(v => !v)} tabIndex={-1}>
                    {showRPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="lp-submit"
                disabled={loading || !rName || !rEmail || !rPw}>
                {loading ? <span className="lp-spinner" /> : 'Sign up'}
              </button>
            </form>
          )}

          {/* ── Social Logins ── */}
          {providers.length > 0 && (
            <>
              <div className="lp-social-divider">
                <span>or continue with</span>
              </div>
              <div className="lp-social-buttons" data-count={providers.length}>
                {providers.map((p) => {
                  const Icon = PROVIDER_ICONS[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="lp-social-btn"
                      onClick={() => startOauth(p.id)}
                    >
                      {Icon && <Icon />} {p.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          
          <div className="lp-footer-switch">
             {mode === 'login' ? (
                <>Don't have an account? <button onClick={() => switchMode('register')}>Sign up</button></>
             ) : (
                <>Already have an account? <button onClick={() => switchMode('login')}>Login</button></>
             )}
          </div>

          <p className="lp-marketing-link">
            <a href={SITE_URL}>← Back to site</a>
          </p>
        </div>
      </div>
    </div>
  );
}
