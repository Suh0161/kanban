import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Eye, EyeOff, Lock, Upload, User, X, Link } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import './css/profile.css';

const AVATAR_SEEDS = [
  'Felix', 'Milo', 'Jasper', 'Leo', 'Maya', 'Aria', 'Luna', 'Oliver',
  'Zoe', 'Kai', 'Nova', 'Sage', 'River', 'Quinn', 'Blake', 'Avery',
];

function presetUrl(seed) {
  return `https://api.dicebear.com/7.x/notionists-neutral/png?seed=${encodeURIComponent(seed)}`;
}

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

  // Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSaved, setPwSaved] = useState(false);

  // Handle file upload — preview locally with a blob URL, defer the real
  // upload to save time. The backend accepts the binary via multipart so
  // we never base64-stuff a 2 MB image into the JSON body.
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setProfileError('Please select an image file'); return; }
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
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwSaving(true);
    setPwError(null);
    setPwSaved(false);
    try {
      await updateProfile({ password: newPw, currentPassword: currentPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
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
          <form onSubmit={handleSaveProfile} className="profile-body">

            {/* Avatar preview + upload actions */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-current">
                <img src={avatarPreview} alt="" className="profile-avatar-img" onError={e => { e.target.src = presetUrl('DemoUser'); }} />
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
                  accept="image/*"
                  className="profile-file-input"
                  onChange={handleFileChange}
                />
              </div>

              <div className="profile-avatar-actions">
                <button type="button" className="profile-upload-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={13} /> Upload photo
                </button>
                <span className="profile-avatar-hint">JPG, PNG, GIF · max 2MB</span>
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
                type="text"
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
          <form onSubmit={handleChangePassword} className="profile-body">
            <div className="profile-field">
              <label htmlFor="current-pw">Current password</label>
              <div className="profile-pw-row">
                <input id="current-pw" type={showCurrent ? 'text' : 'password'} className="profile-input"
                  value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" required />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="new-pw">New password</label>
              <div className="profile-pw-row">
                <input id="new-pw" type={showNew ? 'text' : 'password'} className="profile-input"
                  value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 8 chars, uppercase, number, symbol" required />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="confirm-pw">Confirm new password</label>
              <input id="confirm-pw" type="password" className="profile-input"
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat new password" required />
            </div>

            <div className="profile-pw-hints">
              {[
                { label: 'At least 8 characters', ok: newPw.length >= 8 },
                { label: 'Uppercase letter', ok: /[A-Z]/.test(newPw) },
                { label: 'Lowercase letter', ok: /[a-z]/.test(newPw) },
                { label: 'Number', ok: /\d/.test(newPw) },
                { label: 'Special character', ok: /[^A-Za-z0-9]/.test(newPw) },
              ].map(({ label, ok }) => (
                <span key={label} className={`profile-pw-hint ${ok ? 'ok' : ''}`}>
                  <Check size={10} /> {label}
                </span>
              ))}
            </div>

            {pwError && <p className="profile-error">{pwError}</p>}

            <div className="profile-actions">
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
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
