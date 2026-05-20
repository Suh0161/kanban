import { Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import Logo from '../../components/ui/Logo.jsx';
import './not-found.css';

export default function NotFoundPage() {
  return (
    <main className="secondary-page not-found-page animate-fade-in-up">
      <div className="secondary-page__pattern" aria-hidden="true" />
      <div className="container">
        <div className="section-header">
          <div className="secondary-brand not-found-brand">
            <Logo size={40} className="logo-icon" />
            <span className="secondary-brand-name">Elevate</span>
          </div>
          <p className="not-found-code" aria-hidden="true">
            404
          </p>
          <p className="page-eyebrow">
            <span lang="ja" className="page-kana" aria-hidden="true">迷</span>
            <span className="page-eyebrow-label">Not found</span>
          </p>
          <h1 className="section-heading">This page doesn&apos;t exist.</h1>
          <p className="section-sub">
            The URL may be mistyped, or the page may have moved. Head back to the homepage.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary">
              <Home size={16} />
              Back to home
            </Link>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={16} />
              Go back
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
