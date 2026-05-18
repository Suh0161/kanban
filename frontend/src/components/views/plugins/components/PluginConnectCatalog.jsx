import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import {
  FigmaBrandIcon,
  GitHubBrandIcon,
  GoogleDocsBrandIcon,
  MicrosoftWordBrandIcon,
  NotionBrandIcon,
  SlackBrandIcon,
} from '../../../../assets/integrations/IntegrationBrandIcons.jsx';
import { CATEGORY_FILTERS, PLUGIN_CATALOG } from '../catalog.js';

const CONNECT_BRAND_ICONS = {
  notion: NotionBrandIcon,
  github: GitHubBrandIcon,
  'google-docs': GoogleDocsBrandIcon,
  'microsoft-word': MicrosoftWordBrandIcon,
  slack: SlackBrandIcon,
  figma: FigmaBrandIcon,
};

export default function PluginConnectCatalog({ autoFocusSearch = true }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const searchRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLUGIN_CATALOG.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (!q) return true;
      const blob = `${item.name} ${item.description}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, category]);

  useEffect(() => {
    if (!autoFocusSearch) return undefined;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [autoFocusSearch]);

  return (
    <>
      <div className="plugins-picker__controls">
        <label className="plugins-picker__search-label" htmlFor="plugins-picker-search">
          Search
        </label>
        <input
          id="plugins-picker-search"
          ref={searchRef}
          type="search"
          className="form-input plugins-picker__search"
          placeholder="Filter by name or description…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <div className="plugins-picker__filters" role="group" aria-label="Category">
          {CATEGORY_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={
                category === id
                  ? 'plugins-picker__pill plugins-picker__pill--active'
                  : 'plugins-picker__pill'
              }
              onClick={() => setCategory(id)}
              aria-pressed={category === id}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="plugins-picker__list plugins-picker__list--page" aria-label="Available integrations">
        {filtered.map((item) => {
          const BrandIcon = CONNECT_BRAND_ICONS[item.id];
          return (
            <li key={item.id} className="plugins-picker__row">
              <div className="plugins-picker__row-main">
                <span className="plugins-picker__row-icon plugin-connect-icon" aria-hidden="true">
                  {BrandIcon ? (
                    <BrandIcon />
                  ) : (
                    <FileText size={22} strokeWidth={1.75} />
                  )}
                </span>
                <div className="plugins-picker__row-text">
                  <span className="plugins-picker__row-name">{item.name}</span>
                  <span className="plugins-picker__row-desc">{item.description}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline plugins-picker__connect"
                aria-disabled="true"
                aria-label="Connect — coming soon"
                title="Coming soon — install not available yet"
                tabIndex={-1}
              >
                Connect
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length === 0 ? (
        <p className="plugins-picker__empty" role="status">
          No tools match your search.
        </p>
      ) : null}
    </>
  );
}
