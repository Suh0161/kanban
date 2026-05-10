export default function AnalyticsHealth({ items }) {
  return (
    <section className="workspace-panel analytics-health-panel">
      <div className="workspace-panel-header">
        <div>
          <h2>Operational health</h2>
          <span>Readiness signals from the active board</span>
        </div>
      </div>
      <div className="analytics-health-grid">
        {items.map(item => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}%</strong>
            <div className="workspace-load"><span style={{ width: `${item.value}%` }} /></div>
            <em>{item.detail}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
