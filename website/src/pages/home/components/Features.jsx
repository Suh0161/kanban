const FEATURES = [
  {
    num: '01',
    kana: '板',
    tag: 'Boards',
    title: 'Drag that respects filters',
    desc: 'Reorder pauses while filters are active. Sorted views never corrupt persisted order.',
    wide: true,
  },
  {
    num: '02',
    kana: '積',
    tag: 'Backlog',
    title: 'Groom before sprint',
    desc: 'Priority, due dates, assignees. Promote to the board when ready.',
    wide: false,
  },
  {
    num: '03',
    kana: '役',
    tag: 'Access',
    title: 'Four roles, one surface',
    desc: 'Owner through viewer, API to UI. Read-only grids collapse without gaps.',
    wide: false,
  },
  {
    num: '04',
    kana: '鍵',
    tag: 'API',
    title: 'REST from live routes',
    desc: 'Scoped keys, signed webhooks, OpenAPI regenerated when routes change.',
    wide: true,
  },
];

export default function Features() {
  return (
    <section className="home-features section" id="features" aria-labelledby="home-features-heading">
      <div className="container home-features-layout">
        <header className="home-section-head home-section-head--aside">
          <p className="home-section-eyebrow font-pixel-sm">
            <span lang="ja" className="home-section-kana" aria-hidden="true">
              機能
            </span>
            Capabilities
          </p>
          <h2 id="home-features-heading" className="home-section-title">
            Built for shipping.
            <span className="home-section-title-sub">Not slide decks.</span>
          </h2>
        </header>

        <ul className="home-feature-grid">
          {FEATURES.map(({ num, kana, tag, title, desc, wide }) => (
            <li
              key={num}
              className={`home-feature-cell pixel-border${wide ? ' is-wide' : ''}`}
            >
              <div className="home-feature-index">
                <span className="home-feature-kana" lang="ja" aria-hidden="true">
                  {kana}
                </span>
                <span className="home-feature-num font-pixel-sm" aria-hidden="true">
                  {num}
                </span>
              </div>
              <div className="home-feature-body">
                <span className="home-feature-tag font-pixel-sm">{tag}</span>
                <h3 className="home-feature-title">{title}</h3>
                <p className="home-feature-desc">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
