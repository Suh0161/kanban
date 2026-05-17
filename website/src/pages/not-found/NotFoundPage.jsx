import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="stub-page section" style={{ textAlign: 'center' }}>
      <div className="container">
        <p style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--text-muted)' }}>404</p>
        <h1 className="section-heading" style={{ marginTop: 16 }}>Page not found</h1>
        <p className="section-sub" style={{ marginTop: 12 }}>
          That page doesn't exist. Head back home.
        </p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 32 }}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
