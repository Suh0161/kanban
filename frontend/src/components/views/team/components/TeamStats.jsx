import { BriefcaseBusiness, CircleAlert, UserCheck, UsersRound } from 'lucide-react';

const icons = [UsersRound, BriefcaseBusiness, CircleAlert, UserCheck];

export default function TeamStats({ items }) {
  return (
    <div className="team-stats">
      {items.map((item, index) => {
        const Icon = icons[index] || UsersRound;
        return (
          <div className="workspace-stat team-stat" key={item.label}>
            <Icon size={17} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        );
      })}
    </div>
  );
}
