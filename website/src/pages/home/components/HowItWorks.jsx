import { UserPlus, LayoutDashboard, Webhook, Code2 } from 'lucide-react';

const STEPS = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Create a workspace',
    desc: 'Sign up, create a workspace, and invite your team. Roles are assigned per workspace so one person can be an owner in one and a viewer in another.',
  },
  {
    icon: LayoutDashboard,
    step: '02',
    title: 'Build your board',
    desc: 'Add columns that match your workflow. Create tasks from the board, the backlog, or the inbox. Drag to move, click to open the full detail view.',
  },
  {
    icon: Webhook,
    step: '03',
    title: 'Connect your tools',
    desc: 'Register a webhook to get notified on task events. Generate an API key for your CI pipeline. The OpenAPI spec is generated from code so it\'s always accurate.',
  },
  {
    icon: Code2,
    step: '04',
    title: 'Automate with the API',
    desc: 'Every action in the UI has a corresponding REST endpoint. Read the docs at /api/docs, try requests live in the built-in API console, and build on top of Elevate.',
  },
];

export default function HowItWorks() {
  return (
    <section className="how section" id="how-it-works" aria-labelledby="how-heading">
      <div className="container">
        <div className="section-header">
          <div className="kicker">How it works</div>
          <h2 id="how-heading" className="section-heading">
            Up and running in minutes.
          </h2>
        </div>

        <div className="how-steps">
          {STEPS.map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="how-step">
              <div className="how-step-icon">
                <Icon size={18} />
              </div>
              <div className="how-step-num">{step}</div>
              <h3 className="how-step-title">{title}</h3>
              <p className="how-step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
