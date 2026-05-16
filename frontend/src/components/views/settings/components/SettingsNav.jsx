import { AlertTriangle, BookOpen, Key, Palette, SlidersHorizontal, Tag, Users, Webhook } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/v1';
const API_DOCS_URL = API_BASE.replace('/api/v1', '/api/docs');

const sections = [
  { id: 'general',    label: 'General',    icon: SlidersHorizontal },
  { id: 'members',    label: 'Members',    icon: Users },
  { id: 'attributes', label: 'Attributes', icon: Tag },
  { id: 'labels',     label: 'Labels',     icon: Palette },
  { id: 'api-keys',   label: 'API Keys',   icon: Key },
  { id: 'webhooks',   label: 'Webhooks',   icon: Webhook },
];

export default function SettingsNav({ activeSection, onSelectSection }) {
  return (
    <nav className="settings-nav" aria-label="Settings sections">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`settings-nav-btn ${activeSection === id ? 'active' : ''}`}
          onClick={() => onSelectSection(id)}
        >
          <Icon size={16} /> {label}
        </button>
      ))}

      <div className="settings-nav-divider" />

      <button
        type="button"
        className={`settings-nav-btn danger ${activeSection === 'danger' ? 'active' : ''}`}
        onClick={() => onSelectSection('danger')}
      >
        <AlertTriangle size={16} /> Danger Zone
      </button>

      <a
        href={API_DOCS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="settings-nav-btn"
      >
        <BookOpen size={16} /> API Docs
      </a>
    </nav>
  );
}
