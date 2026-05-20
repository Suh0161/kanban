import { useEffect } from 'react';
import { LOGIN_URL } from '../../config/urls.js';

/** Hand off /login on the marketing site to the Elevate app origin. */
export default function AppLoginRedirect() {
  useEffect(() => {
    window.location.assign(LOGIN_URL);
  }, []);

  return (
    <div className="page-loading" role="status" aria-live="polite">
      <div className="page-spinner" aria-hidden="true" />
      <p className="page-loading-label">Opening Elevate…</p>
    </div>
  );
}
