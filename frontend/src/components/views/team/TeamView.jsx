import { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { TeamCoverage, TeamMemberPanel, TeamStats, TeamWorkload } from './components/index.js';
import { isOverdue } from '../../../utils/helpers.js';
import { apiGet } from '../../../api/client.js';
import { useParams, useNavigate } from 'react-router-dom';
import './css/team.css';

function buildMembersFromTasks(tasks, workspaceMembers) {
  const memberMap = new Map();
  for (const m of workspaceMembers) {
    memberMap.set(m.id, {
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      avatar: m.avatar || `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${encodeURIComponent(m.name || m.id)}`,
      owned: [],
    });
  }

  for (const task of tasks) {
    if (!task.assigneeId) continue;
    if (!memberMap.has(task.assigneeId)) {
      memberMap.set(task.assigneeId, {
        id: task.assigneeId,
        name: task.assigneeName || 'Unknown',
        avatar: task.assigneeImg || `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${encodeURIComponent(task.assigneeId)}`,
        owned: [],
      });
    }
    memberMap.get(task.assigneeId).owned.push(task);
  }

  return Array.from(memberMap.values()).map(member => {
    const owned = member.owned;
    const urgent = owned.filter(t => t.priority === 'Critical' || t.priority === 'High').length;
    const overdueCount = owned.filter(t => isOverdue(t.dueDate)).length;
    const totalActiveLoad = Math.max(tasks.length, 1);
    const load = Math.round((owned.length / totalActiveLoad) * 100);
    let status = 'Available';
    if (overdueCount > 0) status = 'At risk';
    else if (urgent > 0) status = 'Watching';
    else if (owned.length > 0) status = 'Active';
    return { ...member, owned, urgent, overdue: overdueCount, load, status };
  }).sort((a, b) => b.owned.length - a.owned.length);
}

export default function TeamView({ tasks, onSelectTask }) {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState(null);

  useEffect(() => {
    if (!workspaceId) return;
    apiGet(`/workspaces/${workspaceId}/members`)
      .then(data => setWorkspaceMembers(Array.isArray(data) ? data : []))
      .catch(() => setWorkspaceMembers([]));
  }, [workspaceId]);

  const activeTasks = useMemo(
    () => tasks.filter(task => task.columnTitle !== 'Done'),
    [tasks]
  );

  const members = useMemo(
    () => buildMembersFromTasks(activeTasks, workspaceMembers),
    [activeTasks, workspaceMembers]
  );

  const effectiveSelectedId = selectedMemberId ?? members[0]?.id ?? null;
  const selectedMember = members.find(m => m.id === effectiveSelectedId) || members[0];
  const unassigned = activeTasks.filter(task => !task.assigneeId);
  const overloaded = members.filter(member => member.load >= 50);
  const urgent = activeTasks.filter(task => task.priority === 'Critical' || task.priority === 'High');

  return (
    <section className="workspace-view team-view">
      <div className="workspace-page team-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">People</span>
            <h1>Team</h1>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            title="Manage members in Settings"
          >
            <Settings size={14} /> Manage members
          </button>
        </div>

        <TeamStats
          items={[
            { label: 'Members', value: members.length },
            { label: 'Assigned', value: activeTasks.length - unassigned.length },
            { label: 'Unassigned', value: unassigned.length },
            { label: 'Overloaded', value: overloaded.length },
          ]}
        />

        <div className="team-layout">
          <TeamWorkload
            members={members}
            selectedMemberId={selectedMember?.id}
            onSelectMember={setSelectedMemberId}
          />
          <TeamMemberPanel
            member={selectedMember}
            unassigned={unassigned}
            onSelectTask={onSelectTask}
          />
          <TeamCoverage
            tasks={activeTasks}
            urgent={urgent}
            unassigned={unassigned}
            onSelectTask={onSelectTask}
          />
        </div>
      </div>
    </section>
  );
}
