export default function AnalyticsStats({ items }) {
  return (
    <div className="analytics-stats">
      {items.map(({ label, value, meta, icon: Icon }) => (
        <div className="workspace-stat analytics-stat" key={label}>
          <Icon size={18} />
          <span>{label}</span>
          <strong>{value}</strong>
          <em>{meta}</em>
        </div>
      ))}
    </div>
  );
}
