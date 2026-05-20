import { useState, useEffect, useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Moon, Sun, X } from 'lucide-react';
import Logo from '../ui/Logo.jsx';
import { useTheme } from '../../hooks/useTheme.js';
import './navbar.css';

import { DOCS_URL, LOGIN_URL } from '../../config/urls.js';
import { TRY_PATH } from '../../config/nav.js';

const NAV_LINKS = [
  { label: 'Try it', to: TRY_PATH },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Changelog', to: '/changelog' },
];

function navLinkClass({ isActive }) {
  return isActive ? 'navbar-link is-active' : 'navbar-link';
}

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', closeMenu);
    return () => window.removeEventListener('popstate', closeMenu);
  }, [closeMenu]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  const headerClass = [
    'navbar',
    scrolled ? 'is-scrolled' : '',
    menuOpen ? 'is-menu-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={headerClass} role="banner">
      <div className="container navbar-bar">
        <Link to="/" className="navbar-brand" aria-label="Elevate home">
          <Logo variant="wordmark" size={15} className="logo-wordmark" />
        </Link>

        <nav className="navbar-nav" aria-label="Primary">
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink key={label} to={to} className={navLinkClass}>
              {label}
            </NavLink>
          ))}
          <a
            href={DOCS_URL}
            className="navbar-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
        </nav>

        <div className="navbar-end">
          <button
            type="button"
            className="navbar-theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-pressed={!isDark}
          >
            {isDark ? (
              <Sun size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Moon size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>

          <div className="navbar-actions">
            <a href={LOGIN_URL} className="navbar-cta navbar-cta--primary">
              Sign in
            </a>
          </div>

          <button
            type="button"
            className="navbar-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="navbar-drawer"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="navbar-backdrop"
            aria-label="Close menu"
            onClick={closeMenu}
          />
          <div
            id="navbar-drawer"
            className="navbar-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <nav className="navbar-drawer-nav">
              {NAV_LINKS.map(({ label, to }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  {label}
                </NavLink>
              ))}
              <a
                href={DOCS_URL}
                className="navbar-link"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
              >
                Docs
              </a>
            </nav>
            <div className="navbar-drawer-actions">
              <a
                href={LOGIN_URL}
                className="navbar-cta navbar-cta--primary"
                onClick={closeMenu}
              >
                Sign in
              </a>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
