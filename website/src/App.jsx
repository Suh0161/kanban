import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Footer from './components/layout/Footer.jsx';

const HomePage      = lazy(() => import('./pages/home/HomePage.jsx'));
const PricingPage   = lazy(() => import('./pages/pricing/PricingPage.jsx'));
const ChangelogPage = lazy(() => import('./pages/changelog/ChangelogPage.jsx'));
const PrivacyPage   = lazy(() => import('./pages/legal/PrivacyPage.jsx'));
const TermsPage     = lazy(() => import('./pages/legal/TermsPage.jsx'));
const NotFoundPage  = lazy(() => import('./pages/not-found/NotFoundPage.jsx'));

const Fallback = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="page-spinner" />
  </div>
);

export default function App() {
  const { pathname } = useLocation();

  // Scroll to top on route change
  if (typeof window !== 'undefined') {
    window.scrollTo(0, 0);
  }

  return (
    <>
      <Navbar />
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/features"  element={<HomePage />} />
          <Route path="/pricing"   element={<PricingPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/privacy"   element={<PrivacyPage />} />
          <Route path="/terms"     element={<TermsPage />} />
          <Route path="*"          element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Footer />
    </>
  );
}
