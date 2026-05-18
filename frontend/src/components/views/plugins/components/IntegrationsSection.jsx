import { Link } from 'react-router-dom';
import { Bot, CodeXml, Container, Database, GitBranch, PenTool } from 'lucide-react';

const INTEGRATIONS = [
  {
    key: 'ollama',
    title: 'Ollama',
    description: 'Run large language models, like Llama 2, locally.',
    Icon: Bot,
  },
  {
    key: 'docker',
    title: 'Docker',
    description: 'An open platform for developing, shipping, and running applications.',
    Icon: Container,
  },
  {
    key: 'postgres',
    title: 'PostgreSQL',
    description: 'A powerful, open source object-relational database.',
    Icon: Database,
  },
  {
    key: 'penpot',
    title: 'Penpot',
    description: 'The open-source design and prototyping platform.',
    Icon: PenTool,
  },
  {
    key: 'vscodium',
    title: 'VSCodium',
    description: 'A community-driven, freely-licensed binary distribution.',
    Icon: CodeXml,
  },
  {
    key: 'git',
    title: 'Git',
    description: 'A free and open source distributed version control system.',
    Icon: GitBranch,
  },
];

function IntegrationCard({ title, description, Icon }) {
  return (
    <article className="integrations-card">
      <Icon size={28} strokeWidth={1.8} className="integrations-card__icon" aria-hidden />
      <h3 className="integrations-card__title">{title}</h3>
      <p className="integrations-card__description">{description}</p>
    </article>
  );
}

export default function IntegrationsSection({ workspaceId, workspaceName }) {
  const connectHref = workspaceId ? `/workspace/${workspaceId}/plugins/connect` : '/workspace';

  return (
    <section className="integrations-section" aria-labelledby="integrations-heading">
      <div className="integrations-section__shell">
        <div className="integrations-layout">
          <div className="integrations-copy">
            <h2 id="integrations-heading" className="integrations-copy__title">
              Integrate with your favorite tools
            </h2>
            <p className="integrations-copy__subtitle">
              Connect seamlessly with popular open-source platforms and services to enhance your workflow.
            </p>
            {workspaceName ? <p className="integrations-copy__workspace">{workspaceName}</p> : null}
            <p className="integrations-copy__stub-note" role="note">
              Connect and install features are not available yet; Get Started opens the preview catalog only.
            </p>
            <Link className="btn integrations-copy__cta" to={connectHref}>
              Get Started
            </Link>
            <blockquote className="integrations-copy__quote" cite="https://wiki.c2.com/?MakeItWorkMakeItRightMakeItFast">
              <p>Make it work, make it right, make it fast.</p>
              <cite className="integrations-copy__cite">Kent Beck</cite>
            </blockquote>
          </div>

          <div className="integrations-panel" aria-label="Available integrations">
            <div className="integrations-panel__inner">
              <div className="integrations-panel__grid">
                {INTEGRATIONS.map(({ key, ...item }) => (
                  <IntegrationCard key={key} {...item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
