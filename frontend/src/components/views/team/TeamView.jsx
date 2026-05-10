import { useMemo, useState } from 'react';
import { MessageSquare, UserPlus } from 'lucide-react';
import { TEAM_MEMBERS, isOverdue } from '../../../utils/helpers.js';
import { TeamCoverage, TeamMemberPanel, TeamStats, TeamWorkload } from './components/index.js';
import './css/team.css';

const focusByMember = {
  Chatgpt_niy: 'Incident coordination',
  'Sam Lee': 'Reproduction passes',
  'Jordan Kim': 'Leak containment',
  'Morgan Park': 'Player messaging',
  Taylor: 'Crash investigation'
};

function ownerKey(task) {
  return task.assigneeId || task.assigneeName || task.assigneeImg || 'unassigned';
}

function tasksForMember(tasks, member) {
  return tasks.filter(task =>
    task.assigneeId === member.id ||
    task.assigneeName === member.name ||
    task.assigneeImg === member.avatar ||
    task.assigneeImg === member.avatarPng
  );
}

function buildMembers(tasks) {
  const known = TEAM_MEMBERS.map(member => {
    const owned = tasksForMember(tasks, member);
    const urgent = owned.filter(task => task.priority === 'Critical' || task.priority === 'High').length;
    const overdue = owned.filter(task => isOverdue(task.dueDate)).length;
    const comments = owned.reduce((sum, task) => sum + (task.metrics.comments || 0), 0);
    return {
      ...member,
      owned,
      urgent,
      overdue,
      comments,
      load: Math.min(owned.length * 18 + urgent * 14 + overdue * 12, 100),
      focus: focusByMember[member.name] || 'Queue coverage',
      status: overdue > 0 ? 'At risk' : urgent > 0 ? 'Watching' : owned.length > 0 ? 'Active' : 'Available'
    };
  });

  const knownTaskIds = new Set(known.flatMap(member => member.owned.map(task => task.id)));
  const extraOwners = [...new Set(tasks.filter(task => task.assigneeImg && !knownTaskIds.has(task.id)).map(ownerKey))].map((key, index) => {
    const owned = tasks.filter(task => ownerKey(task) === key);
    const sample = owned[0];
    const urgent = owned.filter(task => task.priority === 'Critical' || task.priority === 'High').length;
    const overdue = owned.filter(task => isOverdue(task.dueDate)).length;
    return {
      id: `external-${index}`,
      name: sample.assigneeName || `Owner ${index + 1}`,
      avatar: sample.assigneeImg,
      owned,
      urgent,
      overdue,
      comments: owned.reduce((sum, task) => sum + (task.metrics.comments || 0), 0),
      load: Math.min(owned.length * 18 + urgent * 14 + overdue * 12, 100),
      focus: 'Assigned work',
      status: overdue > 0 ? 'At risk' : urgent > 0 ? 'Watching' : 'Active'
    };
  });

  return [...known, ...extraOwners].filter(member => member.owned.length > 0 || TEAM_MEMBERS.some(teamMember => teamMember.id === member.id));
}

export default function TeamView({ tasks, onSelectTask }) {
  const activeTasks = useMemo(() => tasks.filter(task => task.columnTitle !== 'Done'), [tasks]);
  const members = useMemo(() => buildMembers(activeTasks), [activeTasks]);
  const [selectedMemberId, setSelectedMemberId] = useState(() => members[0]?.id || null);
  const selectedMember = members.find(member => member.id === selectedMemberId) || members[0];
  const unassigned = activeTasks.filter(task => !task.assigneeImg);
  const overloaded = members.filter(member => member.load >= 70);
  const urgent = activeTasks.filter(task => task.priority === 'Critical' || task.priority === 'High');

  return (
    <section className="workspace-view team-view">
      <div className="workspace-page team-page">
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

        <TeamStats
          items={[
            { label: 'Active owners', value: members.filter(member => member.owned.length > 0).length },
            { label: 'Assigned issues', value: activeTasks.length - unassigned.length },
            { label: 'Unassigned', value: unassigned.length },
            { label: 'Overloaded', value: overloaded.length }
          ]}
        />

        <div className="team-layout">
          <TeamWorkload members={members} selectedMemberId={selectedMember?.id} onSelectMember={setSelectedMemberId} />
          <TeamMemberPanel member={selectedMember} unassigned={unassigned} onSelectTask={onSelectTask} />
          <TeamCoverage tasks={activeTasks} urgent={urgent} unassigned={unassigned} onSelectTask={onSelectTask} />
        </div>
      </div>
    </section>
  );
}
