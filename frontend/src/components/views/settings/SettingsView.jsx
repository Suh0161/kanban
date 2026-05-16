import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Select from '../../ui/Select.jsx';
import {
  SettingsApiKeys, SettingsNav, SettingsSectionActions,
  SettingsStatusAside, SettingsWebhooks, SettingsMembers, SettingsDangerZone,
} from './components/index.js';
import SettingsActivityLog from './components/SettingsActivityLog';
import { useAuth } from '../../../hooks/useAuth.js';
import './css/settings.css';

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#f43f5e', '#10b981', '#a855f7',
];

export default function SettingsView({
  workspace, onUpdateWorkspace,
  onReplayGuidedTour, showReplayGuidedTour = false,
  labels = [], onUpdateLabels,
}) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('general');

  const getInitialSettings = () => ({
    name: workspace?.name || '',
    description: workspace?.description || '',
    issuePrefix: workspace?.codePrefix || '',
    customFields: workspace?.customFields || [],
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
      description: draft.description,
      codePrefix: draft.issuePrefix.trim().toUpperCase() || workspace.codePrefix || 'SKY',
      customFields: draft.customFields,
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

  return (
    <section className="settings-view">
      <div className="settings-page">
        <div className="settings-header">
          <span className="settings-kicker">Administration</span>
          <h1 className="settings-title">Workspace Settings</h1>
        </div>

        <div className="settings-container">
          <SettingsNav activeSection={activeSection} onSelectSection={setActiveSection} />

          <div className="settings-content-wrapper">

            {/* ── General ── */}
            {activeSection === 'general' && (
              <div className="settings-content-panel">
                <div className="settings-panel-header">
                  <div>
                    <h2 className="settings-panel-title">Workspace profile</h2>
                    <p className="settings-panel-desc">Basic information about this workspace</p>
                  </div>
                  {renderSectionActions()}
                </div>
                <div className="settings-form">
                  {/* Workspace avatar / initials */}
                  <div className="settings-workspace-identity">
                    <div className="settings-workspace-avatar">
                      {(draft.name || workspace?.name || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="settings-workspace-meta">
                      <span className="settings-workspace-id">ID: {workspace?.id}</span>
                      <span className="settings-workspace-created">
                        Created {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="settings-form-row">
                    <span>Workspace name</span>
                    <input
                      className="settings-input"
                      value={draft.name}
                      onChange={e => updateDraft('name', e.target.value)}
                      placeholder={workspace?.name || 'Workspace name'}
                    />
                  </div>

                  <div className="settings-form-row">
                    <span>Description <span className="settings-optional">(optional)</span></span>
                    <textarea
                      className="settings-input settings-textarea"
                      value={draft.description}
                      onChange={e => updateDraft('description', e.target.value)}
                      placeholder="What is this workspace for?"
                      rows={3}
                      maxLength={500}
                    />
                    <span className="settings-char-count">{(draft.description || '').length}/500</span>
                  </div>

                  <div className="settings-form-row">
                    <span>Issue prefix</span>
                    <div className="settings-prefix-row">
                      <input
                        className="settings-input settings-prefix-input"
                        value={draft.issuePrefix}
                        onChange={e => updateDraft('issuePrefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                        placeholder={workspace?.codePrefix || 'SKY'}
                        maxLength={8}
                      />
                      <span className="settings-prefix-preview">
                        Issues will be named <strong>{draft.issuePrefix || workspace?.codePrefix || 'SKY'}-1000</strong>
                      </span>
                    </div>
                  </div>

                  {showReplayGuidedTour && onReplayGuidedTour && (
                    <div className="settings-form-row">
                      <span>Guided tour</span>
                      <button type="button" className="btn btn-outline btn-sm" onClick={onReplayGuidedTour} style={{ width: 'fit-content' }}>
                        Show tour again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Members ── */}
            {activeSection === 'members' && (
              <SettingsMembers workspaceId={workspace?.id} currentUserId={user?.id} />
            )}

            {/* ── Custom Attributes ── */}
            {activeSection === 'attributes' && (
              <div className="settings-content-panel">
                <div className="settings-panel-header">
                  <div>
                    <h2 className="settings-panel-title">Custom Attributes</h2>
                    <p className="settings-panel-desc">Define extra fields that appear on every task in this workspace</p>
                  </div>
                  {renderSectionActions()}
                </div>
                <div className="settings-form">
                  {draft.customFields.length === 0 ? (
                    <div className="settings-empty-state">
                      <div className="settings-empty-icon">
                        <Plus size={22} />
                      </div>
                      <h3>No custom attributes yet</h3>
                      <p>Add fields like &quot;Severity&quot;, &quot;Sprint&quot;, or &quot;Customer&quot; to track extra data on tasks.</p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => updateDraft('customFields', [{ name: '', type: 'text', options: [] }])}
                      >
                        <Plus size={14} /> Add first attribute
                      </button>
                    </div>
                  ) : (
                    <div className="attr-table">
                      <div className="attr-table-header">
                        <span className="attr-col-drag" />
                        <span className="attr-col-name">Name</span>
                        <span className="attr-col-type">Type</span>
                        <span className="attr-col-delete" />
                      </div>
                      <div className="attr-table-body">
                        {draft.customFields.map((field, index) => (
                          <div key={index} className="attr-row-group">
                            <div className="attr-row">
                              <span className="attr-col-drag attr-drag-handle">⋮⋮</span>
                              <div className="attr-col-name">
                                <div className={`attr-type-dot type-${field.type}`} />
                                <input
                                  className="attr-name-input"
                                  value={field.name}
                                  placeholder="Field name..."
                                  onChange={e => {
                                    const nf = [...draft.customFields];
                                    nf[index] = { ...field, name: e.target.value };
                                    updateDraft('customFields', nf);
                                  }}
                                />
                              </div>
                              <div className="attr-col-type">
                                <Select
                                  value={field.type}
                                  onChange={val => {
                                    const nf = [...draft.customFields];
                                    nf[index] = { ...field, type: val, options: val === 'dropdown' ? (field.options || []) : [] };
                                    updateDraft('customFields', nf);
                                  }}
                                  options={[
                                    { value: 'text', label: 'Short Text' },
                                    { value: 'number', label: 'Number' },
                                    { value: 'dropdown', label: 'Dropdown' },
                                    { value: 'date', label: 'Date' },
                                  ]}
                                />
                              </div>
                              <div className="attr-col-delete">
                                <button
                                  type="button"
                                  className="btn-icon-small danger-hover"
                                  onClick={() => updateDraft('customFields', draft.customFields.filter((_, i) => i !== index))}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            {field.type === 'dropdown' && (
                              <div className="attr-options-editor">
                                <span className="attr-options-label">Options:</span>
                                <div className="attr-options-list">
                                  {(field.options || []).map((opt, oi) => (
                                    <div key={oi} className="attr-option-item">
                                      <input
                                        className="attr-option-input"
                                        value={opt}
                                        placeholder={`Option ${oi + 1}`}
                                        onChange={e => {
                                          const nf = [...draft.customFields];
                                          const newOpts = [...(field.options || [])];
                                          newOpts[oi] = e.target.value;
                                          nf[index] = { ...field, options: newOpts };
                                          updateDraft('customFields', nf);
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="btn-icon-small danger-hover"
                                        onClick={() => {
                                          const nf = [...draft.customFields];
                                          nf[index] = { ...field, options: (field.options || []).filter((_, i) => i !== oi) };
                                          updateDraft('customFields', nf);
                                        }}
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="attr-option-add"
                                    onClick={() => {
                                      const nf = [...draft.customFields];
                                      nf[index] = { ...field, options: [...(field.options || []), ''] };
                                      updateDraft('customFields', nf);
                                    }}
                                  >
                                    <Plus size={12} /> Add option
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="attr-add-btn"
                        onClick={() => updateDraft('customFields', [...draft.customFields, { name: '', type: 'text', options: [] }])}
                      >
                        <Plus size={14} /> Add custom attribute
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Labels ── */}
            {activeSection === 'labels' && (
              <div className="settings-content-panel">
                <div className="settings-panel-header">
                  <div>
                    <h2 className="settings-panel-title">Labels</h2>
                    <p className="settings-panel-desc">Color labels appear as strips on task cards — like Trello</p>
                  </div>
                </div>
                <div className="settings-form">
                  {labels.length === 0 ? (
                    <div className="settings-empty-state">
                      <div className="settings-empty-icon">
                        <Plus size={22} />
                      </div>
                      <h3>No labels yet</h3>
                      <p>Labels help visually categorize tasks on the board at a glance.</p>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onUpdateLabels?.([{ id: uuidv4(), name: '', color: LABEL_COLORS[0] }])}
                      >
                        <Plus size={14} /> Add first label
                      </button>
                    </div>
                  ) : (
                    <div className="label-table">
                      <div className="label-table-header">
                        <span>Color</span>
                        <span>Name</span>
                        <span />
                      </div>
                      {labels.map((label) => (
                        <div key={label.id} className="label-row">
                          <div className="label-color-picker">
                            {LABEL_COLORS.map(color => (
                              <button
                                key={color}
                                type="button"
                                className={`label-color-swatch ${label.color === color ? 'active' : ''}`}
                                style={{ background: color }}
                                onClick={() => onUpdateLabels?.(labels.map(l => l.id === label.id ? { ...l, color } : l))}
                              />
                            ))}
                          </div>
                          <input
                            className="attr-name-input"
                            value={label.name}
                            placeholder="Label name..."
                            onChange={e => onUpdateLabels?.(labels.map(l => l.id === label.id ? { ...l, name: e.target.value } : l))}
                          />
                          <button
                            type="button"
                            className="btn-icon-small danger-hover"
                            onClick={() => onUpdateLabels?.(labels.filter(l => l.id !== label.id))}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="attr-add-btn"
                        onClick={() => onUpdateLabels?.([...labels, { id: uuidv4(), name: '', color: LABEL_COLORS[labels.length % LABEL_COLORS.length] }])}
                      >
                        <Plus size={14} /> Add label
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── API Keys ── */}
            {activeSection === 'api-keys' && (
              <SettingsApiKeys workspaceId={workspace.id} />
            )}

            {/* ── Webhooks ── */}
            {activeSection === 'webhooks' && (
              <SettingsWebhooks workspaceId={workspace.id} />
            )}

            {/* ── Danger Zone ── */}
            {activeSection === 'danger' && (
              <SettingsDangerZone workspaceId={workspace.id} workspaceName={workspace.name} />
            )}
          </div>

          <div className="settings-sidebar">
            <SettingsStatusAside hasChanges={hasChanges} />
            <SettingsActivityLog workspaceId={workspace.id} />
          </div>
        </div>
      </div>
    </section>
  );
}
