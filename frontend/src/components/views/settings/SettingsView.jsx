import { useState } from 'react';
import { Plus, Trash2, X, Lock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Select from '../../ui/Select.jsx';
import {
  SettingsApiKeys, SettingsNav, SettingsSectionActions,
  SettingsStatusAside, SettingsWebhooks, SettingsMembers, SettingsDangerZone,
  WorkspaceLogoField, WorkspaceBackgroundField,
} from './components/index.js';
import SettingsActivityLog from './components/SettingsActivityLog';
import { useAuth } from '../../../hooks/useAuth.js';
import { can } from '../../../hooks/useWorkspaces.js';
import { apiUpload } from '../../../api/client.js';
import { parseServerTime } from '../../../utils/time.js';
import useDebouncedCommit from '../../../hooks/useDebouncedCommit.js';
import { ALLOWED_IMAGE_LABEL, isAllowedImageFile } from '../../../utils/fileTypes.js';
import './css/settings.css';

// Isolated label-name input so each row has its own local state.
// Without this, every keystroke called onUpdateLabels → apiPatch and
// re-rendered the whole settings tree, dropping characters.
function LabelNameInput({ value, onCommit }) {
  const { localValue, onChange, onBlur } = useDebouncedCommit({
    value: value || '',
    onCommit,
    delay: 400,
  });
  return (
    <input
      className="attr-name-input"
      value={localValue}
      placeholder="Label name..."
      onChange={onChange}
      onBlur={onBlur}
    />
  );
}

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#64748b', '#f43f5e', '#10b981', '#a855f7',
];

const ROLE_LABEL = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export default function SettingsView({
  workspace, onUpdateWorkspace,
  onReplayGuidedTour, showReplayGuidedTour = false,
  labels = [], onUpdateLabels,
  initialSection = 'general',
}) {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(initialSection);

  const myRole = workspace?.myRole || 'member';
  const canManage = can.manage(myRole); // owner + admin
  const canDelete = can.delete(myRole); // owner only
  const canEdit = can.edit(myRole);     // owner + admin + member

  const getInitialSettings = () => ({
    name: workspace?.name || '',
    description: workspace?.description || '',
    issuePrefix: workspace?.codePrefix || '',
    customFields: workspace?.customFields || [],
    // Branding values mirror the workspace row. They get edited in-place
    // (preset color clicks, "Reset", file picks), and only flush to the
    // server when the user clicks Save.
    logo: workspace?.logo || '',
    background: workspace?.background || '',
  });

  const [draft, setDraft] = useState(getInitialSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Staged file uploads — held in component state, not in `draft`, because
  // they're not part of the JSON we send and we don't want to lose them on
  // a draft reset. Cleared in `clearStagedFiles` after a successful save
  // or an explicit Reset.
  const [logoFile, setLogoFile] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [logoError, setLogoError] = useState(null);
  const [bgError, setBgError] = useState(null);

  const clearStagedFiles = () => {
    setLogoFile(null);
    setBgFile(null);
    setLogoError(null);
    setBgError(null);
  };

  const updateDraft = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveError(null);
  };

  const saveSettings = async () => {
    if (!workspace?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Upload staged binaries first. The server writes the URL pointer to
      // the workspace row as part of the upload, so we keep the resulting
      // URL out of the PATCH payload to avoid stomping it with a stale
      // value (logoUrl/bgUrl below).
      let logoUrl;
      let bgUrl;
      if (logoFile) {
        const fd = new FormData();
        fd.append('file', logoFile);
        const r = await apiUpload(`/workspaces/${workspace.id}/logo`, fd);
        logoUrl = r?.url ?? null;
      }
      if (bgFile) {
        const fd = new FormData();
        fd.append('file', bgFile);
        const r = await apiUpload(`/workspaces/${workspace.id}/background`, fd);
        bgUrl = r?.url ?? null;
      }

      // Build the JSON patch:
      //  - text fields straight from draft,
      //  - logo: use uploaded URL if a file was staged, else use the
      //    edited draft value (covers the Clear case, draft.logo === '').
      //  - background: same dance, but also accept color strings or '' to
      //    reset.
      const patch = {
        name: draft.name.trim() || workspace.name,
        description: draft.description,
        codePrefix: draft.issuePrefix.trim().toUpperCase() || workspace.codePrefix || 'SKY',
        customFields: draft.customFields,
      };

      // Only include branding fields when the user actually changed them.
      // This keeps the PATCH narrow and avoids stomping a value the user
      // didn't touch on this visit.
      const initialLogo = workspace?.logo || '';
      const initialBg = workspace?.background || '';
      if (logoUrl !== undefined) {
        // We just uploaded a file — server already wrote the row, but we
        // include it in the patch so the response reflects the new URL.
        patch.logo = logoUrl;
      } else if (draft.logo !== initialLogo) {
        patch.logo = draft.logo || null;
      }
      if (bgUrl !== undefined) {
        patch.background = bgUrl;
      } else if (draft.background !== initialBg) {
        patch.background = draft.background || null;
      }

      await onUpdateWorkspace?.(patch);

      clearStagedFiles();
      // Clear staging placeholders so the preview uses real URLs. `pending://logo`
      // is not loadable; `resolveServerUrl` only fixes paths starting with `/`.
      if (logoFile) {
        setDraft((prev) => ({ ...prev, logo: logoUrl ?? '' }));
      }
      if (bgFile) {
        setDraft((prev) => ({ ...prev, background: bgUrl ?? '' }));
      }
      setHasChanges(false);
    } catch (err) {
      setSaveError(err?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetSettings = () => {
    setDraft(getInitialSettings());
    clearStagedFiles();
    setHasChanges(false);
    setSaveError(null);
  };

  const renderSectionActions = () => (
    <SettingsSectionActions
      hasChanges={hasChanges || !!logoFile || !!bgFile}
      onReset={resetSettings}
      onSave={saveSettings}
      saving={saving}
    />
  );

  // Capabilities driving section visibility and per-control gating.
  // Backend remains the source of truth — this just hides what the user
  // can't act on.
  const capabilities = {
    read: true,
    edit: canEdit,
    manage: canManage,
    delete: canDelete,
  };

  // If the user landed on a section they no longer have access to (role
  // changed or they hopped between workspaces), fall back to General for
  // the current render. We avoid a setState-in-effect by deriving the
  // visible section without persisting the change.
  const SECTION_REQUIREMENTS = {
    attributes: 'manage',
    labels: 'manage',
    'api-keys': 'edit',
    webhooks: 'manage',
    danger: 'delete',
  };
  const requirement = SECTION_REQUIREMENTS[activeSection];
  const visibleSection = requirement && !capabilities[requirement]
    ? 'general'
    : activeSection;

  const RoleBadge = (
    <span className={`settings-role-badge role-${myRole}`} title={`Your role: ${ROLE_LABEL[myRole]}`}>
      {!canManage && <Lock size={11} />}
      {ROLE_LABEL[myRole] || 'Member'}
    </span>
  );

  const readOnlyNotice = !canManage ? (
    <div className="settings-readonly-banner">
      <Lock size={13} />
      <span>
        You&apos;re a <strong>{ROLE_LABEL[myRole]}</strong> in this workspace.
        {' '}Only owners and admins can change these settings.
      </span>
    </div>
  ) : null;

  return (
    <section className="settings-view">
      <div className="settings-page">
        <div className="settings-header">
          <span className="settings-kicker">Administration</span>
          <h1 className="settings-title">Workspace Settings</h1>
          {RoleBadge}
        </div>

        <div className="settings-container">
          <SettingsNav
            activeSection={visibleSection}
            onSelectSection={setActiveSection}
            capabilities={capabilities}
          />

          <div className="settings-content-wrapper">

            {/* ── General ── */}
            {visibleSection === 'general' && (
              <div className="settings-content-panel">
                <div className="settings-panel-header">
                  <div>
                    <h2 className="settings-panel-title">Workspace profile</h2>
                    <p className="settings-panel-desc">Basic information about this workspace</p>
                  </div>
                  {canManage && renderSectionActions()}
                </div>
                {readOnlyNotice}
                <div className="settings-form">
                  <WorkspaceLogoField
                    value={workspace?.logo || null}
                    stagedValue={draft.logo === '' ? null : draft.logo}
                    pendingFile={logoFile}
                    workspaceName={workspace?.name}
                    canEdit={canManage}
                    onPickFile={(file) => {
                      // Validate locally so the user gets immediate feedback
                      // even though the actual upload waits for Save.
                      if (!isAllowedImageFile(file)) {
                        setLogoError(`Logo must be ${ALLOWED_IMAGE_LABEL}`);
                        return;
                      }
                      if (file.size > 2 * 1024 * 1024) {
                        setLogoError('Logo must be under 2 MB');
                        return;
                      }
                      setLogoError(null);
                      setLogoFile(file);
                      // Mark draft as having a non-empty logo so the
                      // Replace/Trash buttons render correctly. The real
                      // URL replaces this on Save.
                      setDraft((prev) => ({ ...prev, logo: prev.logo || 'pending://logo' }));
                      setHasChanges(true);
                    }}
                    onClear={() => {
                      setLogoFile(null);
                      setLogoError(null);
                      setDraft((prev) => ({ ...prev, logo: '' }));
                      setHasChanges(true);
                    }}
                    errorMessage={logoError}
                  />

                  <div className="settings-workspace-meta-row">
                    <span className="settings-workspace-id">ID: {workspace?.id}</span>
                    <span className="settings-workspace-created">
                      Created {(() => {
                        const d = parseServerTime(workspace?.created_at);
                        return d
                          ? d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                          : '—';
                      })()}
                    </span>
                  </div>

                  <div className="settings-form-row">
                    <span>Workspace name</span>
                    <input
                      className="settings-input"
                      value={draft.name}
                      onChange={e => updateDraft('name', e.target.value)}
                      placeholder={workspace?.name || 'Workspace name'}
                      disabled={!canManage}
                      readOnly={!canManage}
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
                      disabled={!canManage}
                      readOnly={!canManage}
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
                        disabled={!canManage}
                        readOnly={!canManage}
                      />
                      <span className="settings-prefix-preview">
                        Issues will be named <strong>{draft.issuePrefix || workspace?.codePrefix || 'SKY'}-1000</strong>
                      </span>
                    </div>
                  </div>

                  <div className="settings-form-divider" />

                  <WorkspaceBackgroundField
                    value={workspace?.background || null}
                    stagedValue={draft.background === '' ? '' : draft.background}
                    pendingFile={bgFile}
                    canEdit={canManage}
                    onPickColor={(color) => {
                      // Picking a color clears any staged image — they're
                      // mutually exclusive.
                      setBgFile(null);
                      setBgError(null);
                      setDraft((prev) => ({ ...prev, background: color }));
                      setHasChanges(true);
                    }}
                    onPickFile={(file) => {
                      if (!isAllowedImageFile(file)) {
                        setBgError(`Background must be ${ALLOWED_IMAGE_LABEL}`);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setBgError('Background must be under 5 MB');
                        return;
                      }
                      setBgError(null);
                      setBgFile(file);
                      setDraft((prev) => ({ ...prev, background: 'pending://background' }));
                      setHasChanges(true);
                    }}
                    errorMessage={bgError}
                  />

                  {saveError && (
                    <div className="settings-save-error">
                      {saveError}
                    </div>
                  )}

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
            {visibleSection === 'members' && (
              <SettingsMembers
                workspaceId={workspace?.id}
                currentUserId={user?.id}
                myRole={myRole}
              />
            )}

            {/* ── Custom Attributes ── */}
            {visibleSection === 'attributes' && (
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
            {visibleSection === 'labels' && (
              <div className="settings-content-panel">
                <div className="settings-panel-header">
                  <div>
                    <h2 className="settings-panel-title">Labels</h2>
                    <p className="settings-panel-desc">Color labels appear as strips on task cards.</p>
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
                          <LabelNameInput
                            value={label.name}
                            onCommit={next => onUpdateLabels?.(labels.map(l => l.id === label.id ? { ...l, name: next } : l))}
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
            {visibleSection === 'api-keys' && (
              <SettingsApiKeys workspaceId={workspace.id} />
            )}

            {/* ── Webhooks ── */}
            {visibleSection === 'webhooks' && (
              <SettingsWebhooks workspaceId={workspace.id} />
            )}

            {/* ── Danger Zone ── */}
            {visibleSection === 'danger' && canDelete && (
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
