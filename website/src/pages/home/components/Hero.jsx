import { ArrowRight, Zap } from 'lucide-react';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

export default function Hero() {
  return (
    <section className="hero section" aria-labelledby="hero-heading">
      {/* Ambient glow */}
      <div className="hero-glow" aria-hidden="true" />

      <div className="container hero-inner">
        {/* Kicker */}
        <div className="kicker">
          <Zap size={12} />
          Kanban and planning for focused teams
        </div>

        {/* Headline */}
        <h1 id="hero-heading" className="hero-heading">
          Plan less.<br />
          <span className="gradient-text">Ship more.</span>
        </h1>

        <p className="hero-sub">
          Elevate brings your board, backlog, personal task queue, and team
          workload into one dark-themed workspace. Built for developers who
          want a real API, not just a pretty UI.
        </p>

        {/* CTAs */}
        <div className="hero-actions">
          <a href={`${APP_URL}/login`} className="btn btn-primary btn-lg">
            Get started free
            <ArrowRight size={16} />
          </a>
          <a href={`${APP_URL}/login`} className="btn btn-outline btn-lg">
            Sign in
          </a>
        </div>

        {/* Social proof strip */}
        <p className="hero-note">
          No credit card required · Self-host ready · Full REST API
        </p>

        {/* App preview */}
        <div className="hero-preview" aria-hidden="true">
          <div className="hero-preview-bar">
            <span /><span /><span />
          </div>
          <div className="hero-preview-body">
            <div className="hero-mock-sidebar">
              {['Boards', 'Backlog', 'My Work', 'Team', 'Settings'].map(l => (
                <div key={l} className="hero-mock-nav-item">{l}</div>
              ))}
            </div>
            <div className="hero-mock-board">
              {[
                { col: 'To Do', cards: ['Design system audit', 'API rate limiting'] },
                { col: 'In Progress', cards: ['OAuth integration', 'Webhook SSRF guard'] },
                { col: 'Done', cards: ['JWT auth', 'SQLite schema'] },
              ].map(({ col, cards }) => (
                <div key={col} className="hero-mock-col">
                  <div className="hero-mock-col-head">{col}</div>
                  {cards.map(c => (
                    <div key={c} className="hero-mock-card">{c}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
