/**
 * Logo picker — fully controlled.
 *
 * Parent owns the truth (current value + any staged File). This component
 * only renders the preview and emits change events; nothing persists
 * until the parent's Save flow actually uploads + patches.
 *
 * Props:
 *   value        : string | null  — current saved logo URL on the workspace
 *   stagedValue  : string | null  — value to render as if saved (for clears)
 *   pendingFile  : File | null    — locally-picked file awaiting upload
 *   workspaceName: string         — for the initials fallback
 *   canEdit      : bool
 *   onPickFile   : (File) => void
 *   onClear      : () => void
 */

import { useEffect, useMemo } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { resolveServerUrl } from '../../../../api/client.js';
import { useRef } from 'react';

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function WorkspaceLogoField({
  value,
  stagedValue,
  pendingFile,
  workspaceName,
  canEdit,
  onPickFile,
  onClear,
  errorMessage,
}) {
  const fileRef = useRef(null);

  // Object URL for the locally-picked file. Memoized on the File reference
  // so we only allocate once per pick, and revoked on unmount/replace.
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePick = () => fileRef.current?.click();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onPickFile?.(file);
  };

  // Decide what to actually display:
  //   - locally-staged file beats anything else (most recent intent),
  //   - else the staged value (parent may have asked us to render "no logo"
  //     even though the workspace still has one — i.e. staged a clear),
  //   - else the current saved value, resolved against the API origin.
  const stagedRendered = stagedValue !== undefined ? stagedValue : value;
  const display =
    previewUrl ||
    (stagedRendered ? resolveServerUrl(stagedRendered) : null);
  const hasSomething = !!previewUrl || !!stagedRendered;

  return (
    <div className="settings-logo-field">
      <div className="settings-logo-tile">
        {display ? (
          <img src={display} alt="" className="settings-logo-img" />
        ) : (
          <span className="settings-logo-fallback">{initials(workspaceName)}</span>
        )}
      </div>
      <div className="settings-logo-actions">
        <span className="settings-logo-title">Workspace logo</span>
        <span className="settings-logo-hint">PNG, JPG, GIF, or WebP. Max 2 MB.</span>
        {pendingFile && (
          <span className="settings-logo-hint settings-logo-pending">
            <ImageIcon size={11} /> New logo staged — click Save to apply.
          </span>
        )}
        {errorMessage && <span className="settings-logo-error">{errorMessage}</span>}
        {canEdit && (
          <div className="settings-logo-buttons">
            <button type="button" className="btn btn-outline btn-sm" onClick={handlePick}>
              <Upload size={13} /> {hasSomething ? 'Replace' : 'Upload logo'}
            </button>
            {hasSomething && (
              <button
                type="button"
                className="btn-icon-small danger-hover"
                onClick={onClear}
                title="Remove logo"
              >
                <Trash2 size={13} />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="settings-logo-input"
              onChange={handleFile}
            />
          </div>
        )}
        {!canEdit && !hasSomething && (
          <span className="settings-logo-hint">
            <ImageIcon size={11} /> No logo set.
          </span>
        )}
      </div>
    </div>
  );
}
