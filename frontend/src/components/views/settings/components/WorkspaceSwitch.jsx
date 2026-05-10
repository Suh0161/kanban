export default function WorkspaceSwitch({ checked, onChange, label }) {
  return (
    <span className="workspace-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className="workspace-switch-track">
        <span className="workspace-switch-thumb" />
      </span>
    </span>
  );
}
