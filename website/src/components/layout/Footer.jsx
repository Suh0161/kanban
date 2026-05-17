import { Link } from 'react-router-dom';
import Logo from '../ui/Logo.jsx';
import './footer.css';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://localhost:3001/api/docs';

const LINKS = [
  {
    heading: 'Product',
    items: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    heading: 'Developers',
    items: [
      { label: 'API Docs', href: DOCS_URL },
      { label: 'API Reference', href: `${DOCS_URL}/reference` },
      { label: 'Webhooks guide', href: `${DOCS_URL}/guides/webhooks` },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-brand-link" aria-label="Elevate home">
            <Logo size={28} />
            <span className="footer-brand-name">Elevate</span>
          </Link>
          <p className="footer-tagline">
            Kanban and planning for focused teams.
          </p>
          <a href={`${APP_URL}/login`} className="btn btn-primary btn-sm footer-cta">
            Get started free
          </a>
        </div>

        <nav className="footer-nav" aria-label="Footer">
          {LINKS.map(({ heading, items }) => (
            <div key={heading} className="footer-col">
              <h3 className="footer-col-heading">{heading}</h3>
              <ul className="footer-col-list">
                {items.map(({ label, to, href }) => (
                  <li key={label}>
                    {to
                      ? <Link to={to} className="footer-link">{label}</Link>
                      : <a href={href} className="footer-link" target="_blank" rel="noopener noreferrer">{label}</a>
                    }
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span className="footer-copy">© {new Date().getFullYear()} Elevate. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
