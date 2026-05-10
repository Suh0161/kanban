import { useState } from 'react';
import Select from '../../ui/Select.jsx';
import { SettingsNav, SettingsSectionActions, SettingsStatusAside, WorkspaceSwitch } from './components/index.js';

const visibilityOptions = [
  { value: 'Private', label: 'Private' },
  { value: 'Workspace members', label: 'Workspace members' },
  { value: 'Public read-only', label: 'Public read-only' }
];

const boardOptions = [
  { value: 'Trust & Safety', label: 'Trust & Safety' },
  { value: 'Game Ops', label: 'Game Ops' },
  { value: 'Community Reports', label: 'Community Reports' }
];

const slaOptions = [
  { value: 'Weekdays', label: 'Weekdays' },
  { value: '24/7 Critical only', label: '24/7 Critical only' },
  { value: 'Always on', label: 'Always on' }
];

const digestOptions = [
  { value: 'Daily digest', label: 'Daily digest' },
  { value: 'Weekly digest', label: 'Weekly digest' },
  { value: 'Critical only', label: 'Critical only' }
];

const escalationOptions = [
  { value: 'Immediately', label: 'Immediately' },
  { value: 'After 15 minutes', label: 'After 15 minutes' },
  { value: 'Manual escalation', label: 'Manual escalation' }
];

const inviteOptions = [
  { value: 'Admins only', label: 'Admins only' },
  { value: 'Members can invite', label: 'Members can invite' },
  { value: 'Invite link disabled', label: 'Invite link disabled' }
];

const roleOptions = [
  { value: 'Reporter', label: 'Reporter' },
  { value: 'Moderator', label: 'Moderator' },
  { value: 'Admin', label: 'Admin' }
];

export default function SettingsView({ workspace, onUpdateWorkspace }) {
  const [activeSection, setActiveSection] = useState('general');
  const getInitialSettings = () => ({
    name: workspace?.name || 'Trust & Safety',
    visibility: workspace?.visibility || 'Private',
    defaultBoard: workspace?.defaultBoard || workspace?.name || 'Trust & Safety',
    issuePrefix: workspace?.issuePrefix || 'SKY',
    slaCalendar: workspace?.slaCalendar || 'Weekdays',
    emailDigests: workspace?.emailDigests ?? true,
    autoAssign: workspace?.autoAssign ?? true,
    criticalEscalation: workspace?.criticalEscalation ?? true,
    digestFrequency: workspace?.digestFrequency || 'Daily digest',
    escalationWindow: workspace?.escalationWindow || 'Immediately',
    mentionNotifications: workspace?.mentionNotifications ?? true,
    invitePolicy: workspace?.invitePolicy || 'Members can invite',
    defaultRole: workspace?.defaultRole || 'Reporter',
    requirePrivateBoards: workspace?.requirePrivateBoards ?? true
  });
  const [draft, setDraft] = useState(getInitialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  const updateDraft = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    onUpdateWorkspace?.({
      name: draft.name.trim() || workspace.name,
      visibility: draft.visibility,
      defaultBoard: draft.defaultBoard,
      issuePrefix: draft.issuePrefix.trim() || 'SKY',
      slaCalendar: draft.slaCalendar,
      emailDigests: draft.emailDigests,
      autoAssign: draft.autoAssign,
      criticalEscalation: draft.criticalEscalation,
      digestFrequency: draft.digestFrequency,
      escalationWindow: draft.escalationWindow,
      mentionNotifications: draft.mentionNotifications,
      invitePolicy: draft.invitePolicy,
      defaultRole: draft.defaultRole,
      requirePrivateBoards: draft.requirePrivateBoards
    });
    setHasChanges(false);
  };

  const resetSettings = () => {
    setDraft(getInitialSettings());
    setHasChanges(false);
  };

  const renderSectionActions = () => (
    <SettingsSectionActions hasChanges={hasChanges} onReset={resetSettings} onSave={saveSettings} />
  );

  const renderSwitch = (checked, onChange, label) => <WorkspaceSwitch checked={checked} onChange={onChange} label={label} />;

  return (
    <section className="workspace-view settings-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Administration</span>
            <h1>Settings</h1>
          </div>
        </div>

        <div className="workspace-settings-layout">
          <SettingsNav activeSection={activeSection} onSelectSection={setActiveSection} />

          <div className="workspace-settings-content">
            {activeSection === 'general' && (
              <div className="workspace-panel">
                <div className="workspace-panel-header settings-section-header">
                  <div>
                    <h2>Workspace profile</h2>
                    <span>Defaults used across boards and incoming issues</span>
                  </div>
                  {renderSectionActions()}
                </div>
                <div className="workspace-settings">
                  <label className="workspace-setting-row">
                    <span>Workspace name</span>
                    <input value={draft.name} onChange={e => updateDraft('name', e.target.value)} />
                  </label>
                  <label className="workspace-setting-row">
                    <span>Workspace visibility</span>
                    <Select value={draft.visibility} onChange={value => updateDraft('visibility', value)} options={visibilityOptions} />
                  </label>
                  <label className="workspace-setting-row">
                    <span>Default board</span>
                    <Select value={draft.defaultBoard} onChange={value => updateDraft('defaultBoard', value)} options={boardOptions} />
                  </label>
                  <label className="workspace-setting-row">
                    <span>Issue prefix</span>
                    <input value={draft.issuePrefix} onChange={e => updateDraft('issuePrefix', e.target.value.toUpperCase())} />
                  </label>
                  <label className="workspace-setting-row">
                    <span>SLA calendar</span>
                    <Select value={draft.slaCalendar} onChange={value => updateDraft('slaCalendar', value)} options={slaOptions} />
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="workspace-panel">
                <div className="workspace-panel-header settings-section-header">
                  <div>
                    <h2>Notifications</h2>
                    <span>Alerts for digest, intake, and critical incident workflows</span>
                  </div>
                  {renderSectionActions()}
                </div>
                <div className="workspace-settings">
                  <label className="workspace-setting-row">
                    <span>Digest frequency</span>
                    <Select value={draft.digestFrequency} onChange={value => updateDraft('digestFrequency', value)} options={digestOptions} />
                  </label>
                  <label className="workspace-setting-row">
                    <span>Critical escalation</span>
                    <Select value={draft.escalationWindow} onChange={value => updateDraft('escalationWindow', value)} options={escalationOptions} />
                  </label>
                  <label className="workspace-toggle-row">
                    <span>Email digests</span>
                    {renderSwitch(draft.emailDigests, value => updateDraft('emailDigests', value), 'Email digests')}
                  </label>
                  <label className="workspace-toggle-row">
                    <span>Auto-assign incoming issues</span>
                    {renderSwitch(draft.autoAssign, value => updateDraft('autoAssign', value), 'Auto-assign incoming issues')}
                  </label>
                  <label className="workspace-toggle-row">
                    <span>Escalate critical leaks</span>
                    {renderSwitch(draft.criticalEscalation, value => updateDraft('criticalEscalation', value), 'Escalate critical leaks')}
                  </label>
                  <label className="workspace-toggle-row">
                    <span>Mention notifications</span>
                    {renderSwitch(draft.mentionNotifications, value => updateDraft('mentionNotifications', value), 'Mention notifications')}
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'permissions' && (
              <div className="workspace-panel">
                <div className="workspace-panel-header settings-section-header">
                  <div>
                    <h2>Permissions</h2>
                    <span>Workspace access defaults for new teammates</span>
                  </div>
                  {renderSectionActions()}
                </div>
                <div className="workspace-settings">
                  <label className="workspace-setting-row">
                    <span>Invite policy</span>
                    <Select value={draft.invitePolicy} onChange={value => updateDraft('invitePolicy', value)} options={inviteOptions} />
                  </label>
                  <label className="workspace-setting-row">
                    <span>Default role</span>
                    <Select value={draft.defaultRole} onChange={value => updateDraft('defaultRole', value)} options={roleOptions} />
                  </label>
                  <label className="workspace-toggle-row">
                    <span>Require private boards for sensitive reports</span>
                    {renderSwitch(draft.requirePrivateBoards, value => updateDraft('requirePrivateBoards', value), 'Require private boards for sensitive reports')}
                  </label>
                </div>
              </div>
            )}

          </div>

          <SettingsStatusAside visibility={draft.visibility} emailDigests={draft.emailDigests} hasChanges={hasChanges} />
        </div>
      </div>
    </section>
  );
}
