import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Lock, Upload, User, X, Link } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import { Avatar, SecurePasswordInput } from '../../ui';
import { ALLOWED_IMAGE_ACCEPT, ALLOWED_IMAGE_LABEL, isAllowedImageFile } from '../../../utils/fileTypes.js';
import './css/profile.css';

const AVATAR_SEEDS = [
  'Felix', 'Milo', 'Jasper', 'Leo', 'Maya', 'Aria', 'Luna', 'Oliver',
  'Zoe', 'Kai', 'Nova', 'Sage', 'River', 'Quinn', 'Blake', 'Avery',
];

function presetUrl(seed) {
  return `https://api.dicebear.com/7.x/notionists-neutral/png?seed=${encodeURIComponent(seed)}`;
}

const EMPTY_PW_METRICS = {
  length: 0,
  hasUpper: false,
  hasLower: false,
  hasDigit: false,
  hasSpecial: false,
};

export default function ProfileModal({ onClose }) {
  const { user, updateProfile, uploadAvatar } = useAuth();
  const [tab, setTab] = useState('profile');
  const fileInputRef = useRef(null);

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || presetUrl('DemoUser'));
  // When the user picks a file we keep the File object so we can upload it
  // via multipart on save instead of base64-ing it into the JSON PATCH body.
  // null means "use the URL in `avatarPreview` as-is".
  const [pendingFile, setPendingFile] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password refs — plaintext never stored in React state
  const currentPwRef = useRef(null);
  const newPwRef = useRef(null);
  const confirmPwRef = useRef(null);
  const [currentPwEmpty, setCurrentPwEmpty] = useState(true);
  const [newPwEmpty, setNewPwEmpty] = useState(true);
  const [confirmPwEmpty, setConfirmPwEmpty] = useState(true);
  const [newPwMetrics, setNewPwMetrics] = useState(EMPTY_PW_METRICS);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSaved, setPwSaved] = useState(false);

  // Handle file upload — preview locally with a blob URL, defer the real
  // upload to save time. The backend accepts the binary via multipart so
  // we never base64-stuff a 2 MB image into the JSON body.
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedImageFile(file)) { setProfileError(`Please select a ${ALLOWED_IMAGE_LABEL} image`); return; }
    if (file.size > 2 * 1024 * 1024) { setProfileError('Image must be under 2MB'); return; }
    setProfileError(null);
    setPendingFile(file);
    // Object URL keeps the preview tiny — no base64 inflation.
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Revoke object URLs when the preview changes or the modal closes,
  // so we don't leak memory on repeated uploads.
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleUrlApply = () => {
    if (!urlInput.trim()) return;
    setPendingFile(null);
    setAvatarPreview(urlInput.trim());
    setUrlInput('');
  };

  const handlePresetSelect = (seed) => {
    setPendingFile(null);
    setAvatarPreview(presetUrl(seed));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      // Upload the picked file first (if any) so the URL the server returns
      // is what we persist on the row.
      if (pendingFile) {
        await uploadAvatar(pendingFile);
        setPendingFile(null);
      }
      // Then save name + (preset/URL) avatar. If we just uploaded, the server
      // already updated `users.avatar` to the storage URL, so we only send
      // the name to avoid stomping it with a stale value.
      const updates = pendingFile
        ? { name: name.trim() }
        : { name: name.trim(), avatar: avatarPreview };
      await updateProfile(updates);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err.message || 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const currentPassword = currentPwRef.current?.getValue() ?? '';
    const newPassword = newPwRef.current?.getValue() ?? '';
    const confirmPassword = confirmPwRef.current?.getValue() ?? '';
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    setPwError(null);
    setPwSaved(false);
    try {
      await updateProfile({ password: newPassword, currentPassword });
      currentPwRef.current?.clear();
      newPwRef.current?.clear();
      confirmPwRef.current?.clear();
      setNewPwMetrics(EMPTY_PW_METRICS);
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    } catch (err) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const modal = (
    <div className="profile-backdrop" onMouseDown={onClose}>
      <div className="profile-modal" onMouseDown={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Profile settings">

        {/* Header */}
        <div className="profile-header">
          <h2>Account</h2>
          <button type="button" className="profile-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          <button type="button" className={`profile-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
            <User size={14} /> Profile
          </button>
          <button type="button" className={`profile-tab ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
            <Lock size={14} /> Password
          </button>
        </div>

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="profile-body" autoComplete="on">

            {/* Avatar preview + upload actions */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-current">
                <Avatar
                  key={avatarPreview}
                  src={avatarPreview}
                  name={name || user?.name || 'DemoUser'}
                  seed="DemoUser"
                  alt=""
                  className="profile-avatar-img"
                />
                <button
                  type="button"
                  className="profile-avatar-badge"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload image"
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_IMAGE_ACCEPT}
                  className="profile-file-input"
                  onChange={handleFileChange}
                />
              </div>

              <div className="profile-avatar-actions">
                <button type="button" className="profile-upload-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} /> Upload photo
                </button>
                <span className="profile-avatar-hint">{ALLOWED_IMAGE_LABEL} · max 2MB</span>
              </div>
            </div>

            {/* URL input */}
            <div className="profile-field">
              <label>Or paste an image URL</label>
              <div className="profile-url-row">
                <div className="profile-input-wrap-url">
                  <Link size={13} className="profile-url-icon" />
                  <input
                    type="url"
                    className="profile-input profile-url-input"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleUrlApply())}
                  />
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleUrlApply} disabled={!urlInput.trim()}>
                  Apply
                </button>
              </div>
            </div>

            {/* Preset grid */}
            <div className="profile-field">
              <label>Or choose a preset avatar</label>
              <div className="profile-avatar-grid">
                {AVATAR_SEEDS.map(seed => {
                  const url = presetUrl(seed);
                  return (
                    <button
                      key={seed}
                      type="button"
                      className={`profile-avatar-option ${avatarPreview === url ? 'active' : ''}`}
                      onClick={() => handlePresetSelect(seed)}
                      title={seed}
                    >
                      <img src={url} alt={seed} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div className="profile-field">
              <label htmlFor="profile-name">Display name</label>
              <input
                id="profile-name"
                name="name"
                type="text"
                autoComplete="name"
                className="profile-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                required
              />
            </div>

            {/* Email (read-only) */}
            <div className="profile-field">
              <label>Email address</label>
              <input
                type="email"
                className="profile-input profile-input-readonly"
                value={user?.email || ''}
                autoComplete="email"
                readOnly
                tabIndex={-1}
              />
              <span className="profile-field-hint">Email cannot be changed</span>
            </div>

            {profileError && <p className="profile-error">{profileError}</p>}

            <div className="profile-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={profileSaving || !name.trim()}>
                {profileSaved ? <><Check size={13} /> Saved</> : profileSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {/* ── PASSWORD TAB ── */}
        {tab === 'password' && (
          <form onSubmit={handleChangePassword} className="profile-body" method="post" autoComplete="on">
            <div className="profile-field">
              <label htmlFor="current-pw">Current password</label>
              <div className="profile-pw-row">
                <SecurePasswordInput
                  ref={currentPwRef}
                  id="current-pw"
                  name="current-password"
                  variant="profile"
                  autoComplete="current-password"
                  placeholder="Enter current password"
                  required
                  showLabel="Show current password"
                  hideLabel="Hide current password"
                  onEmptyChange={setCurrentPwEmpty}
                />
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="new-pw">New password</label>
              <div className="profile-pw-row">
                <SecurePasswordInput
                  ref={newPwRef}
                  id="new-pw"
                  name="new-password"
                  variant="profile"
                  autoComplete="new-password"
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  required
                  showLabel="Show new password"
                  hideLabel="Hide new password"
                  onEmptyChange={setNewPwEmpty}
                  onMetricsChange={setNewPwMetrics}
                />
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="confirm-pw">Confirm new password</label>
              <SecurePasswordInput
                ref={confirmPwRef}
                id="confirm-pw"
                name="confirm-password"
                variant="profile"
                autoComplete="new-password"
                placeholder="Repeat new password"
                required
                showToggle={false}
                onEmptyChange={setConfirmPwEmpty}
              />
            </div>

            <div className="profile-pw-hints">
              {[
                { label: 'At least 8 characters', ok: newPwMetrics.length >= 8 },
                { label: 'Uppercase letter', ok: newPwMetrics.hasUpper },
                { label: 'Lowercase letter', ok: newPwMetrics.hasLower },
                { label: 'Number', ok: newPwMetrics.hasDigit },
                { label: 'Special character', ok: newPwMetrics.hasSpecial },
              ].map(({ label, ok }) => (
                <span key={label} className={`profile-pw-hint ${ok ? 'ok' : ''}`}>
                  <Check size={10} /> {label}
                </span>
              ))}
            </div>

            {pwError && <p className="profile-error">{pwError}</p>}

            <div className="profile-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving || currentPwEmpty || newPwEmpty || confirmPwEmpty}>
                {pwSaved ? <><Check size={13} /> Changed</> : pwSaving ? 'Saving...' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
