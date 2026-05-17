import { RotateCcw, Save, Loader2 } from 'lucide-react';

export default function SettingsSectionActions({ hasChanges, onReset, onSave, saving = false }) {
  return (
    <div className="settings-header-actions">
      <span className={hasChanges ? 'settings-save-state dirty' : 'settings-save-state saved'}>
        {saving ? 'Saving…' : (hasChanges ? 'Unsaved changes' : 'Up to date')}
      </span>
      <button className="btn btn-outline btn-sm" type="button" onClick={onReset} disabled={!hasChanges || saving}>
        <RotateCcw size={14} /> Reset
      </button>
      <button className="btn btn-primary btn-sm" type="button" onClick={onSave} disabled={!hasChanges || saving}>
        {saving ? <Loader2 size={14} className="settings-save-spin" /> : <Save size={14} />}
        {saving ? 'Saving' : 'Save'}
      </button>
    </div>
  );
}
