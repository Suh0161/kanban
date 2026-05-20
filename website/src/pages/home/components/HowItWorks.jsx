const STEPS = [
  {
    num: '01',
    kana: '室',
    title: 'Open a workspace',
    desc: 'Sign in, create a space, invite the team. Roles are per workspace.',
  },
  {
    num: '02',
    kana: '段',
    title: 'Shape columns',
    desc: 'Tasks from board, backlog, or inbox. Detail view when you need depth.',
  },
  {
    num: '03',
    kana: '繋',
    title: 'Wire integrations',
    desc: 'Webhooks for lifecycle events. API keys for pipelines. OpenAPI from routes.',
  },
  {
    num: '04',
    kana: '自',
    title: 'Automate via REST',
    desc: 'Every UI action maps to an endpoint. Extend in your own tools.',
  },
];

export default function HowItWorks() {
  return (
    <section className="home-flow section" id="how-it-works" aria-labelledby="home-flow-heading">
      <div className="container home-flow-layout">
        <header className="home-section-head home-section-head--flow">
          <p className="home-section-eyebrow font-pixel-sm">
            <span lang="ja" className="home-section-kana" aria-hidden="true">
              手順
            </span>
            Flow
          </p>
          <h2 id="home-flow-heading" className="home-section-title">
            Signup to automation in four steps.
          </h2>
        </header>

        <ol className="home-flow-list">
          {STEPS.map(({ num, kana, title, desc }) => (
            <li key={num} className="home-flow-row">
              <div className="home-flow-index">
                <span className="home-flow-kana" lang="ja" aria-hidden="true">
                  {kana}
                </span>
                <span className="home-flow-num font-pixel-sm" aria-hidden="true">
                  {num}
                </span>
              </div>
              <div className="home-flow-content">
                <h3 className="home-flow-title">{title}</h3>
                <p className="home-flow-desc">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
