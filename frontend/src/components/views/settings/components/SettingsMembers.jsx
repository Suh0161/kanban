import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Crown, User, ChevronDown } from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPatch } from '../../../../api/client.js';

export default function SettingsMembers({ workspaceId, currentUserId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [changingRole, setChangingRole] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!workspaceId) return;
      try {
        const data = await apiGet(`/workspaces/${workspaceId}/members`);
        if (!cancelled) setMembers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      const newMember = await apiPost(`/workspaces/${workspaceId}/members`, { email: inviteEmail.trim() });
      setInviteEmail('');
      setMembers(prev => [...prev, newMember]);
    } catch (err) {
      setInviteError(err.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId) => {
    setRemoving(userId);
    try {
      await apiDelete(`/workspaces/${workspaceId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.id !== userId));
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    } finally {
      setRemoving(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setChangingRole(userId);
    try {
      await apiPatch(`/workspaces/${workspaceId}/members/${userId}`, { role: newRole });
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert(err.message || 'Failed to update role');
    } finally {
      setChangingRole(null);
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
        {/* Invite form */}
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
          <button type="submit" className="btn btn-primary btn-sm" disabled={!inviteEmail.trim() || inviting}>
            {inviting ? 'Adding...' : 'Add member'}
          </button>
        </form>
        {inviteError && <p className="settings-invite-error">{inviteError}</p>}
        <p className="settings-invite-hint">The user must already have a Jokel account.</p>

        {/* Member list */}
        {loading ? (
          <div className="settings-activity-empty">Loading members...</div>
        ) : (
          <div className="settings-member-list">
            {members.map(member => {
              const isOwner = member.role === 'owner';
              const isSelf = member.id === currentUserId;
              const canManage = !isOwner && !isSelf;

              return (
                <div key={member.id} className="settings-member-row">
                  <img
                    src={member.avatar || `https://api.dicebear.com/7.x/notionists-neutral/png?seed=${encodeURIComponent(member.name || member.id)}`}
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
                  ) : canManage ? (
                    <div className="settings-role-select">
                      <select
                        className="settings-role-dropdown"
                        value={member.role}
                        onChange={e => handleRoleChange(member.id, e.target.value)}
                        disabled={changingRole === member.id}
                        aria-label={`Role for ${member.name}`}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <ChevronDown size={12} className="settings-role-chevron" />
                    </div>
                  ) : (
                    <span className="settings-member-role member">
                      <User size={11} /> Member
                    </span>
                  )}

                  {/* Remove button */}
                  {canManage ? (
                    <button
                      type="button"
                      className="btn-icon-small danger-hover"
                      onClick={() => handleRemove(member.id)}
                      disabled={removing === member.id}
                      title="Remove member"
                    >
                      <Trash2 size={14} />
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
