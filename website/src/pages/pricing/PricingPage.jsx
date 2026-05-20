import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import './pricing.css';
import { LOGIN_URL } from '../../config/urls.js';

/** Flip to true when Pro Cloud price and trial CTA are finalized. */
const CLOUD_PRICING_AVAILABLE = false;

const TIERS = [
  {
    id: 'self-hosted',
    name: 'Self-Hosted',
    price: { monthly: 0, yearly: 0 },
    priceNote: 'forever',
    cta: { href: 'https://github.com/Suh0161/kanban', label: 'View on GitHub', variant: 'outline' },
    features: [
      'Single workspace board',
      'Local SQLite persistence',
      'Basic REST API routes',
      'Standard Kanban views',
    ],
    compare: ['SQLite', 'Local only', 'Manual backups'],
  },
  {
    id: 'pro',
    name: 'Pro Cloud',
    featured: true,
    priceUnavailable: !CLOUD_PRICING_AVAILABLE,
    price: { monthly: 12, yearly: 9 },
    priceNote: 'per user / month',
    unavailableNote: 'Pricing in progress',
    cta: CLOUD_PRICING_AVAILABLE
      ? { href: LOGIN_URL, label: 'Start 14-day trial', variant: 'primary' }
      : { label: 'Coming soon', variant: 'primary', disabled: true },
    features: ['Feature list TBD'],
    compare: ['Global SLA', 'Hourly backups'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    customPrice: true,
    cta: { href: 'mailto:sales@arcnvd.com', label: 'Contact sales', variant: 'outline' },
    features: ['Feature list TBD'],
    compare: ['Custom gateway', 'Continuous WAL'],
  },
];

const FAQS = [
  {
    q: 'Is Pro Cloud pricing available yet?',
    a: 'Not yet. Pro Cloud shows as unavailable while we finalize plans. Self-hosted remains free.',
  },
  {
    q: 'Is self-hosting free?',
    a: 'Yes. Open source on your hardware with local SQLite, no license fee.',
  },
  {
    q: 'How does Postgres sync work?',
    a: 'Pro and Enterprise mirror SQLite commits to Postgres you control.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Start self-hosted, upgrade to Pro for managed sync, or talk to sales for Enterprise.',
  },
  {
    q: 'What protects webhooks?',
    a: 'HMAC-SHA256 signatures on every payload; outbound calls block private subnets.',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState('yearly');
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <main className="secondary-page pricing-page animate-fade-in-up">
      <div className="secondary-page__pattern" aria-hidden="true" />

      <div className="container container-wide">
        <header className="pricing-hero">
          <div className="secondary-header pricing-hero-copy">
            <p className="pair-eyebrow">Pricing</p>
            <h1 className="pair-section-title">Simple, predictable pricing.</h1>
            <p className="pair-section-lead">
              Self-host free today. Managed cloud pricing is being finalized.
            </p>
          </div>

          {CLOUD_PRICING_AVAILABLE && (
          <div className="pricing-billing">
            <div className="pair-segment" role="group" aria-label="Billing cycle">
              <button
                type="button"
                className={`pair-segment__btn${billingCycle === 'monthly' ? ' is-active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
                aria-pressed={billingCycle === 'monthly'}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`pair-segment__btn${billingCycle === 'yearly' ? ' is-active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
                aria-pressed={billingCycle === 'yearly'}
              >
                Yearly
                <span className="pair-segment__pill">−20%</span>
              </button>
            </div>
          </div>
          )}
        </header>

        <section className="pricing-cards" aria-label="Pricing tiers">
          {TIERS.map((tier) => {
            const amount = tier.customPrice || tier.priceUnavailable
              ? null
              : tier.price[billingCycle];

            return (
              <article
                key={tier.id}
                className={`pricing-card secondary-surface${tier.featured ? ' pricing-card--featured' : ''}`}
                data-tier={tier.id}
              >
                {tier.featured && (
                  <span className="pricing-card-badge">Popular</span>
                )}

                <header className="pricing-card-head">
                  <h2 className="pricing-card-name">{tier.name}</h2>
                  <div className="pricing-card-price">
                    {tier.customPrice ? (
                      <>
                        <span className="pricing-card-amount pricing-card-amount--custom">Custom</span>
                        <span className="pricing-card-note">Tailored contract</span>
                      </>
                    ) : tier.priceUnavailable ? (
                      <>
                        <span className="pricing-card-amount pricing-card-amount--custom">Unavailable</span>
                        <span className="pricing-card-note">{tier.unavailableNote}</span>
                      </>
                    ) : (
                      <>
                        <div className="pricing-card-amount-row">
                          <span className="pricing-card-currency">$</span>
                          <span className="pricing-card-amount">{amount}</span>
                        </div>
                        <span className="pricing-card-note">{tier.priceNote}</span>
                      </>
                    )}
                  </div>
                </header>

                {tier.cta.disabled ? (
                  <span
                    className={`btn btn-${tier.cta.variant} pricing-card-cta is-disabled`}
                    aria-disabled="true"
                  >
                    {tier.cta.label}
                  </span>
                ) : (
                  <a
                    href={tier.cta.href}
                    className={`btn btn-${tier.cta.variant} pricing-card-cta`}
                  >
                    {tier.cta.label}
                  </a>
                )}

                <ul className="pricing-card-features">
                  {tier.features.map((feat, featIndex) => (
                    <li key={`${tier.id}-feat-${featIndex}`}>
                      <Check size={14} aria-hidden="true" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <ul className="pricing-card-compare" aria-label={`${tier.name} at a glance`}>
                  {tier.compare.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <hr className="pair-rule" />

        <section className="pricing-faq" aria-labelledby="pricing-faq-heading">
          <h2 id="pricing-faq-heading" className="pricing-faq-title">
            Common questions
          </h2>

          <div className="pricing-faq-list">
            {FAQS.map((faq, i) => {
              const isOpen = expandedFaq === i;
              const panelId = `pricing-faq-panel-${i}`;

              return (
                <div key={faq.q} className={`pricing-faq-item${isOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className="pricing-faq-trigger"
                    onClick={() => toggleFaq(i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                  >
                    <span className="pricing-faq-q">{faq.q}</span>
                    <ChevronDown size={16} className="pricing-faq-icon" aria-hidden="true" />
                  </button>
                  <div id={panelId} className="pricing-faq-panel" hidden={!isOpen}>
                    <p className="pricing-faq-a">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
