export default function AnalyticsBarPanel({ title, subtitle, icon: Icon, items, getWidth, getClassName }) {
  return (
    <div className="workspace-panel analytics-panel">
      <div className="workspace-panel-header">
        <div>
          <h2>{title}</h2>
          <span>{subtitle}</span>
        </div>
        <Icon size={16} />
      </div>
      <div className="workspace-bars">
        {items.length > 0 ? items.map(item => (
          <div className="workspace-bar-row" key={item.label}>
            <span>{item.label}</span>
            <div className="workspace-bar-track">
              <div className={getClassName?.(item) || 'workspace-bar-fill'} style={{ width: getWidth(item) }} />
            </div>
            <strong>{item.count}</strong>
          </div>
        )) : (
          <div className="analytics-empty-chart">
            <strong>No data yet</strong>
            <span>Create or route issues to populate this chart.</span>
          </div>
        )}
      </div>
    </div>
  );
}
