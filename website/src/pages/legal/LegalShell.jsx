import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * @param {{
 *   title: string;
 *   eyebrow: string;
 *   lead: string;
 *   updated: string;
 *   toc: { id: string; label: string }[];
 *   children: React.ReactNode;
 * }} props
 */
function getScrollOffset() {
  const navH = getComputedStyle(document.documentElement).getPropertyValue('--nav-h').trim();
  const navPx = navH.endsWith('px') ? Number.parseFloat(navH) : 64;
  return navPx + 20;
}

export default function LegalShell({ title, eyebrow, lead, updated, toc, children }) {
  const [activeId, setActiveId] = useState(toc[0]?.id ?? '');
  const tocListRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const syncActiveSection = () => {
      const offset = getScrollOffset();
      let current = toc[0]?.id ?? '';

      for (const { id } of toc) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = id;
        }
      }

      setActiveId(current);
    };

    syncActiveSection();
    window.addEventListener('scroll', syncActiveSection, { passive: true });
    window.addEventListener('resize', syncActiveSection, { passive: true });
    return () => {
      window.removeEventListener('scroll', syncActiveSection);
      window.removeEventListener('resize', syncActiveSection);
    };
  }, [toc]);

  useEffect(() => {
    const list = tocListRef.current;
    if (!list || !activeId) return undefined;

    const activeLink = list.querySelector(`a[href="#${activeId}"]`);
    if (!activeLink) return undefined;

    activeLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return undefined;
  }, [activeId]);

  return (
    <main className="secondary-page legal-page animate-fade-in-up">
      <div className="secondary-page__pattern" aria-hidden="true" />
      <div className="container legal-page__inner">
        <header className="secondary-header legal-page__header">
          <p className="secondary-eyebrow">{eyebrow}</p>
          <h1 className="secondary-title">{title}</h1>
          <p className="secondary-lead">{lead}</p>
          <p className="legal-meta">{updated}</p>
        </header>

        <div className="legal-layout">
          <aside className="legal-aside" aria-label={`${title} table of contents`}>
            <p className="legal-aside__label">On this page</p>
            <nav className="legal-toc">
              <ul className="legal-toc__list" ref={tocListRef}>
                {toc.map(({ id, label }) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className={activeId === id ? 'is-active' : undefined}
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="legal-aside__links">
              <Link
                to="/privacy"
                className={pathname === '/privacy' ? 'is-current' : undefined}
                aria-current={pathname === '/privacy' ? 'page' : undefined}
              >
                Privacy
              </Link>
              <span aria-hidden="true"> · </span>
              <Link
                to="/terms"
                className={pathname === '/terms' ? 'is-current' : undefined}
                aria-current={pathname === '/terms' ? 'page' : undefined}
              >
                Terms
              </Link>
            </p>
          </aside>

          <div className="legal-prose">{children}</div>
        </div>
      </div>
    </main>
  );
}
