import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, Eye, EyeOff, Lock, User, X } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.js';
import './css/profile.css';

const AVATAR_SEEDS = [
  'Felix', 'Milo', 'Jasper', 'Leo', 'Maya', 'Aria', 'Luna', 'Oliver',
  'Zoe', 'Kai', 'Nova', 'Sage', 'River', 'Quinn', 'Blake', 'Avery',
];

function avatarUrl(seed) {
  return `https://api.dicebear.com/7.x/notionists-neutral/png?seed=${encodeURIComponent(seed)}`;
}

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [tab, setTab] = useState('profile');

  // Profile tab state
  const [name, setName] = useState(user?.name || '');
  const [avatarSeed, setAvatarSeed] = useState(() => {
    // Try to extract seed from current avatar URL
    const match = user?.avatar?.match(/seed=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : 'DemoUser';
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Password tab state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSaved, setPwSaved] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await updateProfile({
        name: name.trim(),
        avatar: avatarUrl(avatarSeed),
      });
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
          <button
            type="button"
            className={`profile-tab ${tab === 'profile' ? 'active' : ''}`}
            onClick={() => setTab('profile')}
          >
            <User size={14} /> Profile
          </button>
          <button
            type="button"
            className={`profile-tab ${tab === 'password' ? 'active' : ''}`}
            onClick={() => setTab('password')}
          >
            <Lock size={14} /> Password
          </button>
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="profile-body">
            {/* Current avatar + picker */}
            <div className="profile-avatar-section">
              <div className="profile-avatar-current">
                <img src={avatarUrl(avatarSeed)} alt="" className="profile-avatar-img" />
                <div className="profile-avatar-badge">
                  <Camera size={12} />
                </div>
              </div>
              <div className="profile-avatar-info">
                <span className="profile-avatar-label">Choose an avatar</span>
                <div className="profile-avatar-grid">
                  {AVATAR_SEEDS.map(seed => (
                    <button
                      key={seed}
                      type="button"
                      className={`profile-avatar-option ${avatarSeed === seed ? 'active' : ''}`}
                      onClick={() => setAvatarSeed(seed)}
                      title={seed}
                    >
                      <img src={avatarUrl(seed)} alt={seed} />
                    </button>
                  ))}
                </div>
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
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={profileSaving || !name.trim()}>
                {profileSaved ? <><Check size={13} /> Saved</> : profileSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <form onSubmit={handleChangePassword} className="profile-body">
            <div className="profile-field">
              <label htmlFor="current-pw">Current password</label>
              <div className="profile-pw-row">
                <input
                  id="current-pw"
                  type={showCurrent ? 'text' : 'password'}
                  className="profile-input"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  required
                />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="new-pw">New password</label>
              <div className="profile-pw-row">
                <input
                  id="new-pw"
                  type={showNew ? 'text' : 'password'}
                  className="profile-input"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  required
                />
                <button type="button" className="profile-pw-toggle" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="confirm-pw">Confirm new password</label>
              <input
                id="confirm-pw"
                type="password"
                className="profile-input"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </div>

            {/* Password strength hints */}
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
              <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
                Cancel
              </button>
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
