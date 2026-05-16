import { BUCKET_LABELS } from '../backlogUtils.js';

export default function BacklogLane({ title, count, bucket, children }) {
  const desc = bucket === 'all' ? 'Current work in this column' : BUCKET_LABELS[bucket] || '';
  return (
    <section className="workspace-panel backlog-lane">
      <div className="backlog-lane-header">
        <div>
          <h2>{title}</h2>
          <span>{desc}</span>
        </div>
        <strong className={count === 0 ? 'zero' : ''}>{count}</strong>
      </div>
      <div className="backlog-list">
        {children}
      </div>
    </section>
  );
}
