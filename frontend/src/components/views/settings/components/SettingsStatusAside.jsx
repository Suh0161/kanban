import { Activity, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function SettingsStatusAside({ hasChanges }) {
  return (
    <aside className="settings-sidebar-card">
      <div className="settings-sidebar-header">
        <ShieldCheck size={18} />
        <h2 className="settings-sidebar-title">Workspace status</h2>
      </div>
      <div className="settings-status-list">
        <div className="settings-status-item">
          <div className="settings-status-icon healthy">
            <CheckCircle2 size={16} />
          </div>
          <div className="settings-status-content">
            <span className="settings-status-label">Configuration</span>
            <span className="settings-status-value">Healthy</span>
          </div>
        </div>
        <div className="settings-status-item">
          <div className="settings-status-icon">
            <Activity size={16} />
          </div>
          <div className="settings-status-content">
            <span className="settings-status-label">Unsaved changes</span>
            <span className="settings-status-value" style={{ color: hasChanges ? 'var(--color-orange)' : 'var(--text-secondary)' }}>
              {hasChanges ? 'Draft changes pending' : 'All saved'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
