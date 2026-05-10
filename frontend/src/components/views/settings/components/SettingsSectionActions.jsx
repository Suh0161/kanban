import { RotateCcw, Save } from 'lucide-react';

export default function SettingsSectionActions({ hasChanges, onReset, onSave }) {
  return (
    <div className="settings-header-actions">
      <span className={hasChanges ? 'settings-save-state dirty' : 'settings-save-state saved'}>
        {hasChanges ? 'Unsaved changes' : 'Up to date'}
      </span>
      <button className="btn btn-outline btn-sm" type="button" onClick={onReset} disabled={!hasChanges}>
        <RotateCcw size={14} /> Reset
      </button>
      <button className="btn btn-primary btn-sm" type="button" onClick={onSave} disabled={!hasChanges}>
        <Save size={14} /> Save
      </button>
    </div>
  );
}
