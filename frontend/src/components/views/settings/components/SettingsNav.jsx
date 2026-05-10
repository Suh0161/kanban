import { Bell, LockKeyhole, SlidersHorizontal } from 'lucide-react';

const sections = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'permissions', label: 'Permissions', icon: LockKeyhole }
];

export default function SettingsNav({ activeSection, onSelectSection }) {
  return (
    <nav className="workspace-settings-nav" aria-label="Settings sections">
      {sections.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className={activeSection === id ? 'active' : ''} onClick={() => onSelectSection(id)}>
          <Icon size={15} /> {label}
        </button>
      ))}
    </nav>
  );
}
