import { Bell, LockKeyhole, Save, SlidersHorizontal } from 'lucide-react';

const workspaceSettings = [
  ['Workspace visibility', 'Private'],
  ['Default board', 'Trust & Safety'],
  ['Issue prefix', 'SKY'],
  ['SLA calendar', 'Weekdays']
];

export default function SettingsView() {
  return (
    <section className="workspace-view settings-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Administration</span>
            <h1>Settings</h1>
          </div>
          <button className="btn btn-primary btn-sm" type="button"><Save size={14} /> Save changes</button>
        </div>

        <div className="workspace-settings-layout">
          <nav className="workspace-settings-nav" aria-label="Settings sections">
            <button type="button" className="active"><SlidersHorizontal size={15} /> General</button>
            <button type="button"><Bell size={15} /> Notifications</button>
            <button type="button"><LockKeyhole size={15} /> Permissions</button>
          </nav>

          <div className="workspace-settings-content">
            <div className="workspace-panel">
              <div className="workspace-panel-header">
                <div>
                  <h2>Workspace profile</h2>
                  <span>Defaults used across boards and incoming issues</span>
                </div>
              </div>
              <div className="workspace-settings">
                {workspaceSettings.map(([label, value]) => (
                  <label className="workspace-setting-row" key={label}>
                    <span>{label}</span>
                    <input value={value} readOnly />
                  </label>
                ))}
              </div>
            </div>

            <div className="workspace-panel">
              <div className="workspace-panel-header compact">
                <h2>Automation</h2>
                <span>Active</span>
              </div>
              <div className="workspace-settings">
                <label className="workspace-toggle-row">
                  <span>Email digests</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="workspace-toggle-row">
                  <span>Auto-assign incoming issues</span>
                  <input type="checkbox" defaultChecked />
                </label>
                <label className="workspace-toggle-row">
                  <span>Escalate critical leaks</span>
                  <input type="checkbox" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
