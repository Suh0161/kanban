import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, MessageSquare, ShieldAlert, Tags, UsersRound } from 'lucide-react';
import { AnalyticsBarPanel, AnalyticsHealth, AnalyticsRiskList, AnalyticsStats } from './components/index.js';
import { isOverdue } from '../../../utils/helpers.js';
import './css/analytics.css';

const ranges = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'All time', days: null },
];
const priorities = ['Critical', 'High', 'Medium', 'Low'];

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function riskScore(task) {
  const priority = task.priority === 'Critical' ? 5 : task.priority === 'High' ? 3 : task.priority === 'Medium' ? 2 : 1;
  const overdue = isOverdue(task.dueDate) ? 4 : 0;
  const discussion = Math.min(task.metrics.comments || 0, 8) / 2;
  const unassigned = task.assigneeImg ? 0 : 2;
  return priority + overdue + discussion + unassigned;
}

export default function AnalyticsView({ tasks, onSelectTask }) {
  const [rangeDays, setRangeDays] = useState(7);
  const activeTasks = useMemo(() => {
    const open = tasks.filter(task => task.columnTitle !== 'Done');
    if (!rangeDays) return open;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rangeDays);
    return open.filter(task => !task.created_at || new Date(task.created_at) >= cutoff);
  }, [tasks, rangeDays]);
  const urgent = activeTasks.filter(task => task.priority === 'Critical' || task.priority === 'High');
  const overdue = activeTasks.filter(task => isOverdue(task.dueDate));
  const unassigned = activeTasks.filter(task => !task.assigneeImg);
  const scheduled = activeTasks.filter(task => task.dueDate);
  const sprintDraft = activeTasks.filter(task => task.sprintId === 'next-sprint');
  const comments = activeTasks.reduce((sum, task) => sum + (task.metrics.comments || 0), 0);

  const priorityMix = priorities.map(priority => ({
    label: priority,
    count: activeTasks.filter(task => task.priority === priority).length
  }));

  const columnMix = [...new Set(activeTasks.map(task => task.columnTitle))].map(columnTitle => ({
    label: columnTitle,
    count: activeTasks.filter(task => task.columnTitle === columnTitle).length
  }));

  const tagMix = [...new Set(activeTasks.flatMap(task => task.tags))].map(tag => ({
    label: tag,
    count: activeTasks.filter(task => task.tags.includes(tag)).length
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const riskQueue = [...activeTasks].sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 5);

  return (
    <section className="workspace-view analytics-view">
      <div className="workspace-page analytics-page">
        <div className="workspace-page-header">
          <div>
            <span className="workspace-kicker">Reporting</span>
            <h1>Analytics</h1>
          </div>
          <div className="workspace-segmented" aria-label="Analytics range">
            {ranges.map(({ label, days }) => (
              <button key={label} type="button" className={rangeDays === days ? 'active' : ''} onClick={() => setRangeDays(days)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <AnalyticsStats
          items={[
            { label: 'Active issues', value: activeTasks.length, meta: rangeDays ? `Last ${rangeDays} days` : 'All time', icon: ShieldAlert },
            { label: 'Urgent', value: urgent.length, meta: 'Critical and high', icon: AlertTriangle },
            { label: 'Overdue', value: overdue.length, meta: 'Past due date', icon: Clock3 },
            { label: 'Unassigned', value: unassigned.length, meta: 'Needs owner', icon: UsersRound },
            { label: 'Discussion', value: comments, meta: 'Open comments', icon: MessageSquare }
          ]}
        />

        <div className="analytics-layout">
          <div className="analytics-main">
            <AnalyticsHealth
              items={[
                { label: 'Scheduled', value: percent(scheduled.length, activeTasks.length), detail: `${scheduled.length} of ${activeTasks.length} cards` },
                { label: 'Owned', value: percent(activeTasks.length - unassigned.length, activeTasks.length), detail: `${unassigned.length} unassigned` },
                { label: 'Sprint draft', value: percent(sprintDraft.length, activeTasks.length), detail: `${sprintDraft.length} staged` },
                { label: 'Urgency load', value: percent(urgent.length, activeTasks.length), detail: `${urgent.length} urgent` }
              ]}
            />

            <div className="analytics-chart-grid">
              <AnalyticsBarPanel
                title="Priority mix"
                subtitle="Current active issue distribution"
                icon={AlertTriangle}
                items={priorityMix}
                getWidth={item => `${Math.max(percent(item.count, activeTasks.length), item.count ? 8 : 2)}%`}
                getClassName={item => `workspace-bar-fill ${item.label.toLowerCase()}`}
              />
              <AnalyticsBarPanel
                title="Board flow"
                subtitle="Where active work is sitting"
                icon={CheckCircle2}
                items={columnMix}
                getWidth={item => `${Math.max(percent(item.count, activeTasks.length), item.count ? 8 : 2)}%`}
              />
              <AnalyticsBarPanel
                title="Tag demand"
                subtitle="Most common report categories"
                icon={Tags}
                items={tagMix}
                getWidth={item => `${Math.max(percent(item.count, activeTasks.length), item.count ? 8 : 2)}%`}
              />
            </div>
          </div>

          <AnalyticsRiskList
            tasks={riskQueue}
            onSelectTask={onSelectTask}
            overdueCount={overdue.length}
            scheduledCount={scheduled.length}
            icon={CalendarClock}
          />
        </div>
      </div>
    </section>
  );
}
