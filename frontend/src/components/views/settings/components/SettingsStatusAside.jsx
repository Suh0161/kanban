import { Activity, Bell, CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react';

export default function SettingsStatusAside({ visibility, emailDigests, hasChanges }) {
  return (
    <aside className="workspace-panel workspace-settings-aside">
      <div className="workspace-panel-header compact">
        <h2>Workspace status</h2>
        <ShieldCheck size={16} />
      </div>
      <div className="workspace-settings-status">
        <div className="compact">
          <CheckCircle2 size={16} />
          <span>Configuration</span>
          <strong>Healthy</strong>
        </div>
        <div className="compact">
          <KeyRound size={16} />
          <span>Access policy</span>
          <strong>{visibility}</strong>
        </div>
        <div className="compact">
          <Bell size={16} />
          <span>Notifications</span>
          <strong>{emailDigests ? 'Enabled' : 'Limited'}</strong>
        </div>
        <div className="settings-activity">
          <Activity size={16} />
          <span>Recent admin activity</span>
          <strong>{hasChanges ? 'Draft changes pending' : 'Settings are up to date'}</strong>
        </div>
      </div>
    </aside>
  );
}
