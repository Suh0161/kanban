import { UsersRound } from 'lucide-react';

export default function TeamWorkload({ members, selectedMemberId, onSelectMember }) {
  return (
    <section className="workspace-panel team-workload">
      <div className="workspace-panel-header">
        <div>
          <h2>Workload</h2>
          <span>Owners, active issues, and capacity</span>
        </div>
        <UsersRound size={16} />
      </div>
      <div className="team-member-list">
        {members.map(member => (
          <button
            type="button"
            className={selectedMemberId === member.id ? 'team-member-card active' : 'team-member-card'}
            key={member.id}
            onClick={() => onSelectMember(member.id)}
          >
            <img src={member.avatar} alt="" className="avatar" />
            <div>
              <strong>{member.name}</strong>
              <span>{member.focus}</span>
            </div>
            <div className="team-load-cell">
              <span>{member.owned.length} cards</span>
              <div className="workspace-load"><span style={{ width: `${member.load}%` }} /></div>
            </div>
            <em className={member.status.toLowerCase().replace(' ', '-')}>{member.status}</em>
          </button>
        ))}
      </div>
    </section>
  );
}
