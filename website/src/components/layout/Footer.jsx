import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import Logo from '../ui/Logo.jsx';
import { DOCS_URL, LOGIN_URL } from '../../config/urls.js';
import { TRY_PATH } from '../../config/nav.js';
import './footer.css';

function GithubIcon({ size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.406-1.03-1.036-1.39-1.036-1.39-.82-.558.083-.72.083-.72 1.205.082 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const GITHUB_URL = 'https://github.com/Suh0161/kanban';

const LINKS = [
  {
    heading: 'Product',
    items: [
      { label: 'Try it', to: TRY_PATH },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Changelog', to: '/changelog' },
    ],
  },
  {
    heading: 'Developers',
    items: [
      { label: 'API Docs', href: DOCS_URL },
      { label: 'API Reference', href: `${DOCS_URL}/reference` },
      { label: 'Webhooks Guide', href: `${DOCS_URL}/guides/webhooks` },
    ],
  },
  {
    heading: 'Company',
    items: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <figure className="footer-art" aria-hidden="true">
        <img
          src="/footer-illustration.png"
          alt=""
          loading="lazy"
          decoding="async"
          className="footer-art__img footer-art__img--night render-pixelated"
        />
        <img
          src="/footer-illustration-morning.png"
          alt=""
          loading="lazy"
          decoding="async"
          className="footer-art__img footer-art__img--morning render-pixelated"
        />
        <div className="footer-art__scrim" />
      </figure>

      <div className="footer-surface">
        <div className="container footer-main__content">
          <div className="footer-brand">
            <Link to="/" className="footer-brand-link" aria-label="Elevate home">
              <Logo variant="wordmark" size={18} className="logo-wordmark" />
            </Link>
            <p className="footer-tagline">
              Workspace software for teams that plan, track, and deliver work together.
            </p>

            <a href={LOGIN_URL} className="footer-cta">
              Open app
            </a>
          </div>

          <nav className="footer-nav" aria-label="Footer">
            {LINKS.map(({ heading, items }) => (
              <div key={heading} className="footer-col">
                <h3 className="footer-col-heading">{heading}</h3>
                <ul className="footer-col-list">
                  {items.map(({ label, to, href }) => (
                    <li key={label}>
                      {to ? (
                        <Link to={to} className="footer-link">
                          {label}
                        </Link>
                      ) : (
                        <a
                          href={href}
                          className="footer-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className="footer-meta">
            <p className="footer-copy">
              © {new Date().getFullYear()} Elevate
            </p>

            <div className="footer-meta__actions">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social"
                aria-label="GitHub repository"
              >
                <GithubIcon size={16} />
              </a>

              <button
                type="button"
                className="footer-top"
                onClick={scrollToTop}
              >
                <ArrowUp size={14} strokeWidth={1.75} />
                <span>Back to top</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
