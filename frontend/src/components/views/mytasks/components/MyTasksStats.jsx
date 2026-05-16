export default function MyTasksStats({ items, activeQueue, onQueueClick }) {
  return (
    <div className="mytasks-stats">
      {items.map(({ key, label, value, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`workspace-stat mytasks-stat ${activeQueue === key ? 'is-active' : ''}`}
          onClick={() => onQueueClick(key)}
        >
          <Icon size={17} />
          <span>{label}</span>
          <strong>{value}</strong>
        </button>
      ))}
    </div>
  );
}
