import { Kanban, ListTodo, Webhook, Key, Users, BarChart2 } from 'lucide-react';

const FEATURES = [
  {
    icon: Kanban,
    title: 'Kanban board',
    desc: 'Drag cards across columns, filter by priority or tag, and collapse the sidebar for a wider canvas. Drag-and-drop is disabled while filters are active so you never accidentally reorder a filtered view.',
  },
  {
    icon: ListTodo,
    title: 'Backlog planning',
    desc: 'Groom issues, mark sprint draft candidates, and track readiness. Each row shows priority, status, due date, and a health indicator so nothing slips through.',
  },
  {
    icon: Users,
    title: 'Role-based access',
    desc: 'Owner, admin, member, and viewer roles. Viewers see everything but can\'t edit. Admins manage members and settings. One owner per workspace, enforced at the database level.',
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    desc: 'Subscribe to task lifecycle events. Every payload is HMAC-SHA256 signed. The dispatcher blocks RFC1918 addresses and IMDS endpoints so you can\'t accidentally point it at internal infrastructure.',
  },
  {
    icon: Key,
    title: 'API keys',
    desc: 'Create scoped, expiring API keys for bots and CI pipelines. Keys are stored as SHA-256 hashes. The raw key is shown once at creation — same model as GitHub personal access tokens.',
  },
  {
    icon: BarChart2,
    title: 'Analytics and team view',
    desc: 'Priority mix, board flow, workload distribution, and coverage breakdown — all derived from live board data, no separate analytics pipeline needed.',
  },
];

export default function Features() {
  return (
    <section className="features section" id="features" aria-labelledby="features-heading">
      <div className="container">
        <div className="section-header">
          <div className="kicker">Features</div>
          <h2 id="features-heading" className="section-heading">
            Everything a team needs.<br />Nothing it doesn't.
          </h2>
          <p className="section-sub">
            Elevate is opinionated about what a planning tool should do.
            No plugins, no marketplace, no feature bloat.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={20} />
              </div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
