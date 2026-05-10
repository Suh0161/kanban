import { CalendarClock, ClipboardList, Flame, ListChecks, Milestone } from 'lucide-react';

export default function BacklogStats({ total, ready, grooming, unscheduled, highUrgency, sprintDraft }) {
  const stats = [
    { label: 'Open issues', value: total, icon: ClipboardList },
    { label: 'Ready for sprint', value: ready, icon: ListChecks },
    { label: 'Sprint draft', value: sprintDraft, icon: Milestone },
    { label: 'Needs grooming', value: grooming, icon: Flame },
    { label: 'Unscheduled', value: unscheduled, icon: CalendarClock }
  ];

  return (
    <div className="backlog-stats">
      {stats.map(({ label, value, icon: Icon }) => (
        <div className="workspace-stat backlog-stat" key={label}>
          <Icon size={17} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
      <div className="backlog-alert">
        <Flame size={16} />
        <span>High urgency</span>
        <strong>{highUrgency}</strong>
      </div>
    </div>
  );
}
