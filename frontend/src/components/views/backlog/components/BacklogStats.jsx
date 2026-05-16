import { CalendarClock, CheckCircle2, ClipboardList, Flame, ListChecks, Milestone, TriangleAlert } from 'lucide-react';

const stats = [
  { key: 'total',       bucket: 'all',         label: 'Open issues',    icon: ClipboardList,  accent: null },
  { key: 'ready',       bucket: 'ready',        label: 'Ready',          icon: CheckCircle2,   accent: 'blue' },
  { key: 'sprintDraft', bucket: 'sprint',       label: 'Sprint draft',   icon: Milestone,      accent: 'purple' },
  { key: 'grooming',    bucket: 'grooming',     label: 'Needs grooming', icon: Flame,          accent: 'orange' },
  { key: 'overdue',     bucket: 'overdue',      label: 'Overdue',        icon: TriangleAlert,  accent: 'red' },
  { key: 'unscheduled', bucket: 'unscheduled',  label: 'Unscheduled',    icon: CalendarClock,  accent: null },
  { key: 'highUrgency', bucket: 'urgent',        label: 'High urgency',   icon: ListChecks,     accent: 'orange' },
];

export default function BacklogStats({ total, ready, grooming, unscheduled, overdue, highUrgency, sprintDraft, onBucketClick, activeBucket }) {
  const values = { total, ready, grooming, unscheduled, overdue, highUrgency, sprintDraft };

  return (
    <div className="backlog-stats">
      {stats.map(({ key, bucket, label, icon: Icon, accent }) => {
        const val = values[key];
        const isActive = bucket && activeBucket === bucket;
        const isClickable = !!bucket;
        return (
          <button
            key={key}
            type="button"
            className={`backlog-stat-card ${accent ? `accent-${accent}` : ''} ${isActive ? 'is-active' : ''} ${isClickable ? 'is-clickable' : ''}`}
            onClick={isClickable ? () => onBucketClick(bucket) : undefined}
            disabled={!isClickable}
          >
            <Icon size={16} className="backlog-stat-icon" />
            <span className="backlog-stat-label">{label}</span>
            <strong className="backlog-stat-value">{val}</strong>
          </button>
        );
      })}
    </div>
  );
}
