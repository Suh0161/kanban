import { useMemo } from 'react';
import { AlertTriangle, Users, Flame } from 'lucide-react';
import { isOverdue } from '../../utils/helpers.js';
import { Tooltip } from '../ui';

function getRiskScore(task) {
  const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
  let score = priorityWeight[task.priority] || 0;
  if (task.dueDate && new Date(task.dueDate) < new Date()) score += 4;
  score += Math.min((task.commentCount || task.metrics?.comments || 0), 5);
  if (!task.assigneeId) score += 2;
  return score;
}

export default function BoardStatsBar({ tasks, onSelectTask }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const urgent = tasks.filter(t => t.priority === 'Critical').length;
    const overdue = tasks.filter(t => isOverdue(t.dueDate)).length;
    const unassigned = tasks.filter(t => !t.assigneeId && !t.assigneeImg).length;
    const hot = [...tasks]
      .sort((a, b) => getRiskScore(b) - getRiskScore(a))
      .slice(0, 5);

    return { total, urgent, overdue, unassigned, hot };
  }, [tasks]);

  return (
    <div className="board-stats-bar">
      <div className="stat-item">
        <span>Active</span>
        <span className="stat-value">{stats.total}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <AlertTriangle size={12} />
        <span>Urgent</span>
        <span className="stat-value">{stats.urgent}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span>Overdue</span>
        <span className="stat-value">{stats.overdue}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <Users size={12} />
        <span>Unassigned</span>
        <span className="stat-value">{stats.unassigned}</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <Flame size={12} />
        <span>Hot</span>
        {stats.hot.map(task => (
          <Tooltip key={task.id} content={task.title}>
            <span
              className="stat-hot"
              onClick={() => onSelectTask(task)}
            >
              {task.code}
            </span>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
