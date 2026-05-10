export default function BacklogLane({ title, description, count, children }) {
  return (
    <section className="workspace-panel backlog-lane">
      <div className="backlog-lane-header">
        <div>
          <h2>{title}</h2>
          <span>{description}</span>
        </div>
        <strong>{count}</strong>
      </div>
      <div className="backlog-list">
        {children}
      </div>
    </section>
  );
}
