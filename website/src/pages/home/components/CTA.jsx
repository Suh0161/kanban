import { ArrowRight } from 'lucide-react';
import { DOCS_URL, LOGIN_URL } from './constants.js';

export default function CTA() {
  return (
    <section className="home-cta section-sm" aria-labelledby="home-cta-heading">
      <div className="container">
        <div className="home-cta-band">
          <div className="home-cta-copy">
            <p className="home-cta-eyebrow font-pixel-sm">Get started</p>
            <h2 id="home-cta-heading" className="home-cta-title">
              Start your workspace
            </h2>
            <p className="home-cta-lead">
              Free to try. No card required. Invite your team when the board is ready.
            </p>
          </div>
          <div className="home-cta-actions">
            <a href={LOGIN_URL} className="btn btn-primary btn-lg btn-pixel">
              Sign in
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              href={DOCS_URL}
              className="btn btn-outline btn-lg btn-pixel"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read docs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
