import { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo.jsx';
import './navbar.css';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://localhost:3001/api/docs';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, []);

  return (
    <header className={`navbar ${scrolled ? 'is-scrolled' : ''}`} role="banner">
      <div className="container navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" aria-label="Elevate home">
          <Logo size={26} />
          <span className="navbar-brand-name">Elevate</span>
        </Link>

        {/* Desktop nav */}
        <nav className="navbar-links" aria-label="Primary">
          <NavLink to="/features" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Features</NavLink>
          <NavLink to="/pricing" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Pricing</NavLink>
          <NavLink to="/changelog" className={({ isActive }) => isActive ? 'navbar-link active' : 'navbar-link'}>Changelog</NavLink>
          <a href={DOCS_URL} className="navbar-link" target="_blank" rel="noopener noreferrer">Docs</a>
        </nav>

        {/* Desktop CTAs */}
        <div className="navbar-actions">
          <a href={`${APP_URL}/login`} className="btn btn-ghost btn-sm">Sign in</a>
          <a href={`${APP_URL}/login`} className="btn btn-primary btn-sm">Get started</a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="navbar-hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(v => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="navbar-drawer" role="dialog" aria-label="Mobile navigation">
          <nav className="navbar-drawer-links">
            <NavLink to="/features" onClick={() => setMenuOpen(false)}>Features</NavLink>
            <NavLink to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</NavLink>
            <NavLink to="/changelog" onClick={() => setMenuOpen(false)}>Changelog</NavLink>
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Docs</a>
          </nav>
          <div className="navbar-drawer-actions">
            <a href={`${APP_URL}/login`} className="btn btn-outline">Sign in</a>
            <a href={`${APP_URL}/login`} className="btn btn-primary">Get started</a>
          </div>
        </div>
      )}
    </header>
  );
}
