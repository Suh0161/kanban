import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';

const HomePage      = lazy(() => import('./pages/home/HomePage.jsx'));
const PricingPage   = lazy(() => import('./pages/pricing/PricingPage.jsx'));
const TryPage       = lazy(() => import('./pages/try/index.js'));
const ChangelogPage = lazy(() => import('./pages/changelog/ChangelogPage.jsx'));
const PrivacyPage   = lazy(() => import('./pages/legal/PrivacyPage.jsx'));
const TermsPage     = lazy(() => import('./pages/legal/TermsPage.jsx'));
const AppLoginRedirect = lazy(() => import('./pages/app-login/AppLoginRedirect.jsx'));
const NotFoundPage  = lazy(() => import('./pages/not-found/NotFoundPage.jsx'));

const Fallback = () => (
  <div className="page-loading">
    <div className="page-spinner" aria-hidden="true" />
  </div>
);

export default function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="site-shell">
      <Navbar />
      <main className="site-main">
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/"          element={<HomePage />} />
            <Route path="/features" element={<Navigate to="/try" replace />} />
            <Route path="/try"      element={<TryPage />} />
            <Route path="/pricing"  element={<PricingPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/privacy"   element={<PrivacyPage />} />
            <Route path="/terms"     element={<TermsPage />} />
            <Route path="/login"     element={<AppLoginRedirect />} />
            <Route path="*"          element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
