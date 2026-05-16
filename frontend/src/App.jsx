import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './hooks/useAuth.js';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';

const LoginPage = lazy(() => import('./components/views/login/LoginPage.jsx'));
const WorkspaceList = lazy(() => import('./components/views/workspace-list/WorkspaceList.jsx'));
const WorkspaceLayout = lazy(() => import('./components/layout/WorkspaceLayout.jsx'));
const PrivacyPage = lazy(() => import('./components/views/legal/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./components/views/legal/TermsPage.jsx'));

const Fallback = () => <div className="app-loading"><div className="app-loading-spinner" /></div>;

export default function App() {
  const { loading } = useAuth();

  if (loading) return <Fallback />;

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Suspense fallback={<Fallback />}><LoginPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<Fallback />}><PrivacyPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<Fallback />}><TermsPage /></Suspense>} />
        <Route path="/workspace" element={<Suspense fallback={<Fallback />}><WorkspaceList /></Suspense>} />
        <Route path="/workspace/:workspaceId/*" element={<Suspense fallback={<Fallback />}><WorkspaceLayout /></Suspense>} />
      </Routes>
    </ErrorBoundary>
  );
}
