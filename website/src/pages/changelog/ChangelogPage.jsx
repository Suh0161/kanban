import { useState, useMemo } from 'react';
import './changelog.css';

const CATEGORIES = ['All', 'Features', 'Improvements', 'Security'];

const ENTRIES = [
  {
    version: 'v1.2.0',
    date: 'May 20, 2026',
    dateTime: '2026-05-20',
    category: 'Security',
    title: 'Signed webhooks and SSRF guards',
    desc: 'HMAC-SHA256 on every dispatch; private subnets and metadata endpoints blocked.',
    bullets: ['Signed payloads', 'API keys shown once; SHA-256 at rest'],
  },
  {
    version: 'v1.1.0',
    date: 'May 12, 2026',
    dateTime: '2026-05-12',
    category: 'Features',
    title: 'Board sandbox and SQLite transactions',
    desc: 'Live Kanban on the landing page; dev writes batch in synchronous transactions.',
    bullets: ['Interactive board demo', 'Transaction-wrapped writes'],
  },
  {
    version: 'v1.0.5',
    date: 'Apr 28, 2026',
    dateTime: '2026-04-28',
    category: 'Improvements',
    title: 'Avatar referrer and sidebar collapse',
    desc: 'Google avatars no longer 403; collapsed sidebar hides overflow cleanly.',
    bullets: ['referrerPolicy on avatars', 'Read-only grid when edit columns hide'],
  },
  {
    version: 'v1.0.4',
    date: 'Apr 15, 2026',
    dateTime: '2026-04-15',
    category: 'Improvements',
    title: 'OpenAPI portal and rate limits',
    desc: 'Static API reference from Zod routes; per-IP limits on auth and uploads.',
    bullets: ['openapi.json on boot', '429 with Retry-After'],
  },
  {
    version: 'v1.0.0',
    date: 'Mar 30, 2026',
    dateTime: '2026-03-30',
    category: 'Features',
    title: 'Elevate 1.0',
    desc: 'Multi-workspace Kanban, backlog, roles, JWT and API key auth.',
    bullets: ['Drag-and-drop board', 'Four roles enforced server-side'],
  },
];

export default function ChangelogPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const counts = useMemo(() => {
    const map = { All: ENTRIES.length };
    CATEGORIES.slice(1).forEach((cat) => {
      map[cat] = ENTRIES.filter((e) => e.category === cat).length;
    });
    return map;
  }, []);

  const filteredEntries = activeCategory === 'All'
    ? ENTRIES
    : ENTRIES.filter((entry) => entry.category === activeCategory);

  return (
    <main className="secondary-page changelog-page animate-fade-in-up">
      <div className="secondary-page__pattern" aria-hidden="true" />

      <div className="container">
        <header className="secondary-header changelog-header">
          <p className="pair-eyebrow">Changelog</p>
          <h1 className="pair-section-title">Release notes</h1>
          <p className="pair-section-lead">
            Small, reviewable releases.
          </p>

          <div
            className="changelog-filters"
            role="tablist"
            aria-label="Filter release notes by category"
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`changelog-filter ${activeCategory === cat ? 'is-active' : ''}`}
              >
                {cat}
                <span className="changelog-filter-count" aria-hidden="true">
                  {counts[cat]}
                </span>
              </button>
            ))}
          </div>
        </header>

        <section
          className="changelog-feed"
          aria-label="Release notes"
          aria-live="polite"
        >
          {filteredEntries.length === 0 ? (
            <p className="changelog-empty">
              No release notes in this category yet.
            </p>
          ) : (
            <ol className="changelog-list">
              {filteredEntries.map((entry) => (
                <li key={entry.version} className="changelog-entry">
                  <div className="changelog-entry-meta">
                    <time
                      className="changelog-entry-date"
                      dateTime={entry.dateTime}
                    >
                      {entry.date}
                    </time>
                    <span className="changelog-entry-version font-pixel-sm">
                      {entry.version}
                    </span>
                    <span className="changelog-entry-category">
                      {entry.category}
                    </span>
                  </div>

                  <h2 className="changelog-entry-title">{entry.title}</h2>
                  <p className="changelog-entry-desc">{entry.desc}</p>

                  <ul className="changelog-entry-bullets">
                    {entry.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
