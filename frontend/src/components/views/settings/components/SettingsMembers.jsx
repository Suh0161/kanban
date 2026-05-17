import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Crown, User, Lock, LogOut, Shield, Eye } from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPatch, resolveServerUrl } from '../../../../api/client.js';
import Select from '../../../ui/Select.jsx';
import { Avatar } from '../../../ui';
import { ErrorState } from '../../error';

const ROLE_OPTIONS = [
  { value: 'admin',  label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'viewer', label: 'Viewer' },
];

export default function SettingsMembers({ workspaceId, currentUserId, myRole = 'member' }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteError, setInviteError] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [actionError, setActionError] = useState(null);

  const isOwnerRole = myRole === 'owner';
  const isAdminRole = myRole === 'admin';
  const canManage = isOwnerRole || isAdminRole;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!workspaceId) return;
      try {
        const data = await apiGet(`/workspaces/${workspaceId}/members`);
        const list = Array.isArray(data)
          ? data.map((m) => ({ ...m, avatar: resolveServerUrl(m.avatar) }))
          : [];
        if (!cancelled) {
          setMembers(list);
          setLoadError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId, reloadKey]);

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    setReloadKey((k) => k + 1);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      const newMember = await apiPost(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      setMembers(prev => [...prev, { ...newMember, avatar: resolveServerUrl(newMember.avatar) }]);
    } catch (err) {
      setInviteError(err.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId) => {
    setRemoving(userId);
    setActionError(null);
    try {
      await apiDelete(`/workspaces/${workspaceId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      setActionError(err.message || 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionError(null);
    try {
      await apiPatch(`/workspaces/${workspaceId}/members/${userId}`, { role: newRole });
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      setActionError(err.message || 'Failed to update role');
    }
  };

  return (
    <div className="settings-content-panel">
      <div className="settings-panel-header">
        <div>
          <h2 className="settings-panel-title">Members</h2>
          <p className="settings-panel-desc">Manage who has access to this workspace</p>
        </div>
        <span className="settings-member-count">{members.length} member{members.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="settings-form">
        {/* Invite form — owners and admins only */}
        {canManage ? (
          <>
            <form onSubmit={handleInvite} className="settings-invite-row">
              <div className="settings-invite-field">
                <UserPlus size={15} className="settings-invite-icon" />
                <input
                  type="email"
                  className="settings-invite-input"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(null); }}
                  placeholder="Invite by email address..."
                  disabled={inviting}
                />
              </div>
              <Select
                value={inviteRole}
                onChange={(val) => setInviteRole(val)}
                options={ROLE_OPTIONS}
                className="settings-invite-role"
              />
              <button type="submit" className="btn btn-primary btn-sm" disabled={!inviteEmail.trim() || inviting}>
                {inviting ? 'Adding...' : 'Add member'}
              </button>
            </form>
            {inviteError && <p className="settings-invite-error">{inviteError}</p>}
            <p className="settings-invite-hint">The user must already have an Elevate account.</p>
          </>
        ) : (
          <div className="settings-readonly-banner">
            <Lock size={13} />
            <span>Only owners and admins can invite or remove members.</span>
          </div>
        )}

        {actionError && <p className="settings-invite-error">{actionError}</p>}

        {/* Member list */}
        {loadError ? (
          <ErrorState
            error={loadError}
            title="Couldn't load members"
            onRetry={retryLoad}
          />
        ) : loading ? (
          <div className="settings-activity-empty">Loading members...</div>
        ) : (
          <div className="settings-member-list">
            {members.map(member => {
              const isOwner = member.role === 'owner';
              const isSelf = member.id === currentUserId;
              // Admins can manage members below them; owners can manage anyone except themselves.
              // No one can demote/remove the owner — that requires transfer of ownership.
              const targetIsHigher = isOwner; // only owner outranks admin/member
              const canChangeThisRole = canManage && !isOwner && !isSelf && (isOwnerRole || !targetIsHigher);
              const canRemoveThis = canManage && !isOwner && !isSelf;
              const showLeave = isSelf && !isOwner;

              return (
                <div key={member.id} className="settings-member-row">
                  <Avatar
                    src={member.avatar}
                    name={member.name || member.id}
                    alt=""
                    className="avatar settings-member-avatar"
                  />
                  <div className="settings-member-info">
                    <span className="settings-member-name">
                      {member.name}
                      {isSelf && <span className="settings-member-you">you</span>}
                    </span>
                    <span className="settings-member-email">{member.email}</span>
                  </div>

                  {/* Role badge / selector */}
                  {isOwner ? (
                    <span className="settings-member-role owner">
                      <Crown size={11} /> Owner
                    </span>
                  ) : canChangeThisRole ? (
                    <Select
                      value={member.role}
                      onChange={(val) => handleRoleChange(member.id, val)}
                      options={ROLE_OPTIONS}
                      className="settings-role-select"
                    />
                  ) : (
                    <span className={`settings-member-role ${member.role}`}>
                      {member.role === 'admin' && <><Shield size={11} /> Admin</>}
                      {member.role === 'member' && <><User size={11} /> Member</>}
                      {member.role === 'viewer' && <><Eye size={11} /> Viewer</>}
                    </span>
                  )}

                  {/* Remove / leave */}
                  {canRemoveThis ? (
                    <button
                      type="button"
                      className="btn-icon-small danger-hover"
                      onClick={() => handleRemove(member.id)}
                      disabled={removing === member.id}
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : showLeave ? (
                    <button
                      type="button"
                      className="btn-icon-small danger-hover"
                      onClick={() => {
                        if (window.confirm('Leave this workspace? You will lose access immediately.')) {
                          handleRemove(member.id);
                        }
                      }}
                      disabled={removing === member.id}
                      title="Leave workspace"
                    >
                      <LogOut size={14} />
                    </button>
                  ) : (
                    <span className="settings-member-spacer" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
