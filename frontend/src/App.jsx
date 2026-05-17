import { Routes, Route, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { setUnauthorizedHandler } from './api/client.js';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import {
  NotFoundPage,
  ForbiddenPage,
  ServerErrorPage,
  OfflinePage,
  OfflineBanner,
} from './components/views/error';

const LoginPage = lazy(() => import('./components/views/login/LoginPage.jsx'));
const OauthCallback = lazy(() => import('./components/views/login/OauthCallback.jsx'));
const WorkspaceList = lazy(() => import('./components/views/workspace-list/WorkspaceList.jsx'));
const WorkspaceLayout = lazy(() => import('./components/layout/WorkspaceLayout.jsx'));
const PrivacyPage = lazy(() => import('./components/views/legal/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./components/views/legal/TermsPage.jsx'));

const Fallback = () => <div className="app-loading"><div className="app-loading-spinner" /></div>;

export default function App() {
  const { loading } = useAuth();
  const navigate = useNavigate();

  // Wire the global 401 handler so an expired session bounces the user
  // back to login instead of leaving the previous screen sitting there
  // with stale data. The api client already cleared the token by the
  // time this runs.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Don't redirect if we're already on a public page.
      const path = window.location.pathname;
      if (path === '/' || path === '/privacy' || path === '/terms') return;
      navigate('/', { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  if (loading) return <Fallback />;

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Suspense fallback={<Fallback />}><LoginPage /></Suspense>} />
        <Route path="/oauth/callback" element={<Suspense fallback={<Fallback />}><OauthCallback /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<Fallback />}><PrivacyPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<Fallback />}><TermsPage /></Suspense>} />
        <Route path="/workspace" element={<Suspense fallback={<Fallback />}><WorkspaceList /></Suspense>} />
        <Route path="/workspace/:workspaceId/*" element={<Suspense fallback={<Fallback />}><WorkspaceLayout /></Suspense>} />

        {/* Direct error routes — handy for support links and intentional
            redirects from inside the app (e.g. permission denied). */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="/500" element={<ServerErrorPage />} />
        <Route path="/offline" element={<OfflinePage />} />

        {/* Catch-all: anything that didn't match a route above. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
