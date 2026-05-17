import { ArrowRight } from 'lucide-react';

const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://localhost:3001/api/docs';

export default function CTA() {
  return (
    <section className="cta section-sm" aria-labelledby="cta-heading">
      <div className="container">
        <div className="cta-card">
          <div className="cta-glow" aria-hidden="true" />
          <div className="cta-content">
            <h2 id="cta-heading" className="cta-heading">
              Ready to elevate your workflow?
            </h2>
            <p className="cta-sub">
              Start for free. No credit card. No time limit on the free tier.
            </p>
            <div className="cta-actions">
              <a href={`${APP_URL}/login`} className="btn btn-primary btn-lg">
                Get started free
                <ArrowRight size={16} />
              </a>
              <a href={DOCS_URL} className="btn btn-outline btn-lg" target="_blank" rel="noopener noreferrer">
                Read the docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
