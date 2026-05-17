/**
 * Board background picker — fully controlled.
 *
 * Parent owns the value + any staged File. The component only emits
 * change events; persistence happens via the parent's Save flow.
 *
 * The `value` (or staged equivalent) is one of:
 *   ''        — default (theme canvas color)
 *   '#xxxxxx' — solid color
 *   URL       — image (http(s) or `/api/v1/backgrounds/...`)
 *
 * Props:
 *   value       : string | null
 *   stagedValue : string | null  — overrides `value` while editing
 *   pendingFile : File | null    — locally-picked image awaiting upload
 *   canEdit     : bool
 *   onPickColor : (string) => void   — '' to reset
 *   onPickFile  : (File) => void
 *   errorMessage: string | null
 */

import { useEffect, useMemo, useRef } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { resolveServerUrl } from '../../../../api/client.js';

const PRESET_COLORS = [
  { value: '',        label: 'Default' },
  { value: '#0a0a0a', label: 'Black'   },
  { value: '#0f172a', label: 'Slate'   },
  { value: '#1e1b4b', label: 'Indigo'  },
  { value: '#3b0764', label: 'Purple'  },
  { value: '#0c4a6e', label: 'Ocean'   },
  { value: '#064e3b', label: 'Forest'  },
  { value: '#7c2d12', label: 'Sunset'  },
];

function isImageUrl(value) {
  if (!value) return false;
  return /^(https?:\/\/|\/api\/v1\/backgrounds\/)/i.test(value);
}

function isColor(value) {
  return typeof value === 'string' && value.startsWith('#');
}

export default function WorkspaceBackgroundField({
  value,
  stagedValue,
  pendingFile,
  canEdit,
  onPickColor,
  onPickFile,
  errorMessage,
}) {
  const fileRef = useRef(null);

  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Effective value being rendered: staged > prop > ''.
  const effective = stagedValue !== undefined ? (stagedValue || '') : (value || '');
  const showImageFromUrl = isImageUrl(effective);
  const previewBg = previewUrl || (showImageFromUrl ? resolveServerUrl(effective) : null);

  const handlePick = () => fileRef.current?.click();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    onPickFile?.(file);
  };

  return (
    <div className="settings-bg-field">
      <div className="settings-bg-preview-wrap">
        <div
          className="settings-bg-preview"
          style={{
            background: previewBg
              ? `url(${previewBg}) center / cover no-repeat`
              : (isColor(effective) ? effective : 'var(--bg-canvas)'),
          }}
          aria-label="Board background preview"
        >
          <div className="settings-bg-mock">
            <div className="settings-bg-mock-col" />
            <div className="settings-bg-mock-col" />
            <div className="settings-bg-mock-col" />
          </div>
        </div>
        {(effective || previewBg) && canEdit && (
          <button
            type="button"
            className="settings-bg-reset"
            onClick={() => onPickColor?.('')}
            title="Reset to default"
          >
            <X size={12} /> Reset
          </button>
        )}
      </div>

      <div className="settings-bg-controls">
        <span className="settings-bg-title">Board background</span>
        <span className="settings-bg-hint">Pick a preset color or upload an image. Max 5 MB.</span>
        {pendingFile && (
          <span className="settings-logo-hint settings-logo-pending">
            <ImageIcon size={11} /> New background staged — click Save to apply.
          </span>
        )}

        {canEdit && (
          <>
            <div className="settings-bg-swatches" role="radiogroup" aria-label="Background presets">
              {PRESET_COLORS.map((c) => {
                // Active state: image preview wins; otherwise compare colors.
                const active = previewBg
                  ? false
                  : (c.value || '') === effective;
                return (
                  <button
                    key={c.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={c.label}
                    title={c.label}
                    className={`settings-bg-swatch ${active ? 'is-active' : ''} ${c.value ? '' : 'is-default'}`}
                    style={c.value ? { background: c.value } : undefined}
                    onClick={() => onPickColor?.(c.value)}
                  >
                    {!c.value && <span className="settings-bg-default-glyph">A</span>}
                  </button>
                );
              })}
            </div>

            <div className="settings-bg-buttons">
              <button type="button" className="btn btn-outline btn-sm" onClick={handlePick}>
                <Upload size={13} /> {previewBg || showImageFromUrl ? 'Replace image' : 'Upload image'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="settings-logo-input"
                onChange={handleFile}
              />
            </div>
          </>
        )}

        {errorMessage && <span className="settings-logo-error">{errorMessage}</span>}
      </div>
    </div>
  );
}
