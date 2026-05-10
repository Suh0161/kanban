export default function MyTasksFocus({ items }) {
  return (
    <section className="workspace-panel mytasks-focus-plan">
      <div className="workspace-panel-header compact">
        <h2>Focus plan</h2>
        <span>Today</span>
      </div>
      <div className="mytasks-timeline">
        {items.map(({ time, title, meta, icon: Icon }) => (
          <div key={time}>
            <Icon size={15} />
            <span>{time}</span>
            <strong>{title}</strong>
            <em>{meta}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
