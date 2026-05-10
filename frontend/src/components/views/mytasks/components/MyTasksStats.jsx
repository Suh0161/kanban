export default function MyTasksStats({ items }) {
  return (
    <div className="mytasks-stats">
      {items.map(({ label, value, icon: Icon }) => (
        <div className="workspace-stat mytasks-stat" key={label}>
          <Icon size={17} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
