import { UsersRound } from 'lucide-react';

export default function TeamWorkload({ members, selectedMemberId, onSelectMember }) {
  return (
    <section className="workspace-panel team-workload">
      <div className="workspace-panel-header">
        <div>
          <h2>Workload</h2>
          <span>Members and active capacity</span>
        </div>
        <UsersRound size={16} />
      </div>
      <div className="team-member-list">
        {members.length === 0 ? (
          <div className="workspace-empty-state">
            <strong>No members yet</strong>
            <span>Go to Settings → Members to add teammates.</span>
          </div>
        ) : (
          members.map(member => (
            <div
              key={member.id}
              className={`team-member-row ${selectedMemberId === member.id ? 'active' : ''}`}
            >
              <button
                type="button"
                className="team-member-card"
                onClick={() => onSelectMember(member.id)}
              >
                <img src={member.avatar} alt="" className="avatar" />
                <div className="team-member-info">
                  <strong>{member.name}</strong>
                  <span>{member.email || member.role || ''}</span>
                </div>
                <div className="team-load-cell">
                  <span>{member.owned.length} {member.owned.length === 1 ? 'card' : 'cards'}</span>
                  <div className="workspace-load"><span style={{ width: `${member.load}%` }} /></div>
                </div>
                <em className={`team-status ${member.status.toLowerCase().replace(' ', '-')}`}>
                  {member.status}
                </em>
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
