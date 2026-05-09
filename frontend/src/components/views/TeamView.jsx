import { MessageSquare, UserPlus, UsersRound } from 'lucide-react';

const teamMembers = [
  { name: 'Alex Carter', role: 'Moderator Lead', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Felix', load: 8, focus: 'Exploit escalation', status: 'Online' },
  { name: 'Sam Lee', role: 'QA Analyst', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Milo', load: 5, focus: 'Reproduction passes', status: 'Reviewing' },
  { name: 'Jordan Kim', role: 'Security', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Jasper', load: 6, focus: 'Leak containment', status: 'In meeting' },
  { name: 'Morgan Park', role: 'Community Ops', avatar: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Leo', load: 4, focus: 'Player messaging', status: 'Online' }
];

export default function TeamView() {
  return (
    <section className="workspace-view team-view">
      <div className="workspace-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">People</span>
            <h1>Team</h1>
          </div>
          <div className="workspace-actions">
            <button className="btn btn-outline btn-sm" type="button"><MessageSquare size={14} /> Message</button>
            <button className="btn btn-primary btn-sm" type="button"><UserPlus size={14} /> Invite</button>
          </div>
        </div>

        <div className="workspace-team-layout">
          <div className="workspace-panel primary">
            <div className="workspace-panel-header">
              <div>
                <h2>Workload</h2>
                <span>Current capacity across Trust & Safety</span>
              </div>
              <UsersRound size={16} />
            </div>
            <div className="workspace-team-table">
              {teamMembers.map(member => (
                <div className="workspace-member-row" key={member.name}>
                  <img src={member.avatar} alt="" className="avatar" />
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.role}</span>
                  </div>
                  <span>{member.focus}</span>
                  <div className="workspace-load">
                    <span style={{ width: `${member.load * 10}%` }} />
                  </div>
                  <em>{member.status}</em>
                </div>
              ))}
            </div>
          </div>

          <aside className="workspace-panel side">
            <div className="workspace-panel-header compact">
              <h2>Coverage</h2>
              <span>Today</span>
            </div>
            <div className="workspace-coverage">
              <div><span>Exploit response</span><strong>2 owners</strong></div>
              <div><span>Moderation queue</span><strong>1 owner</strong></div>
              <div><span>Community updates</span><strong>1 owner</strong></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
