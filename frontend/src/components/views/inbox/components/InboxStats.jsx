export default function InboxStats({ items }) {
  return (
    <div className="inbox-stats">
      {items.map(({ label, value, icon: Icon }) => (
        <div className="workspace-stat inbox-stat" key={label}>
          <Icon size={17} />
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
