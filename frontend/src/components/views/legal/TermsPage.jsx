import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Layers, FileText } from 'lucide-react';
import './css/legal.css';

const TOC = [
  { id: 'acceptance',   label: 'Acceptance of Terms' },
  { id: 'service',      label: 'Description of Service' },
  { id: 'accounts',     label: 'Accounts & Registration' },
  { id: 'acceptable',   label: 'Acceptable Use' },
  { id: 'content',      label: 'Your Content' },
  { id: 'ip',           label: 'Intellectual Property' },
  { id: 'privacy',      label: 'Privacy' },
  { id: 'security',     label: 'Security' },
  { id: 'termination',  label: 'Termination' },
  { id: 'disclaimers',  label: 'Disclaimers' },
  { id: 'liability',    label: 'Limitation of Liability' },
  { id: 'governing',    label: 'Governing Law' },
  { id: 'changes',      label: 'Changes to Terms' },
  { id: 'contact',      label: 'Contact' },
];

export default function TermsPage() {
  const [activeId, setActiveId] = useState(TOC[0].id);

  useEffect(() => {
    const sections = TOC.map(({ id }) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-74px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="legal-root">
      <nav className="legal-nav">
        <Link to="/" className="legal-nav-brand">
          <div className="legal-nav-brand-icon"><Layers size={14} /></div>
          <span>Jokel</span>
        </Link>
        <Link to="/" className="legal-nav-back">
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      </nav>

      <div className="legal-shell">
        <aside className="legal-sidebar">
          <div className="legal-sidebar-inner">
            <p className="legal-sidebar-title">Terms of Service</p>
            <ul className="legal-toc">
              {TOC.map(({ id, label }) => (
                <li key={id} className={activeId === id ? 'active' : ''}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="legal-main">
          <div className="legal-badge"><FileText size={12} /> Legal Agreement</div>
          <h1 className="legal-title">Terms of Service</h1>
          <div className="legal-meta">
            <span>Effective May 17, 2026</span>
            <span className="legal-meta-sep">·</span>
            <span>Last updated May 17, 2026</span>
          </div>

          <section className="legal-section" id="acceptance">
            <h2 className="legal-section-title">Acceptance of Terms</h2>
            <p>By accessing or using Jokel (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
            <p>By creating an account, you confirm that you are at least 16 years old and have the legal capacity to enter into this agreement.</p>
            <div className="legal-callout">
              <div className="legal-callout-dot" />
              <p>These Terms form a legally binding agreement between you and Jokel. Please read them carefully before using the Service.</p>
            </div>
          </section>

          <section className="legal-section" id="service">
            <h2 className="legal-section-title">Description of Service</h2>
            <p>Jokel is a workspace management and project planning platform providing Kanban boards, backlog management, team collaboration tools, and related features.</p>
            <p>The Service is provided &quot;as is&quot; and may be updated, modified, or discontinued at any time with reasonable notice where possible.</p>
          </section>

          <section className="legal-section" id="accounts">
            <h2 className="legal-section-title">Accounts & Registration</h2>
            <p>To use Jokel, you must create an account. You agree to:</p>
            <ul>
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain the security of your password and account credentials.</li>
              <li>Notify us immediately of any unauthorized access to your account.</li>
              <li>Accept responsibility for all activities that occur under your account.</li>
              <li>Not share your account credentials with others.</li>
              <li>Not create accounts for the purpose of abuse, spam, or circumventing restrictions.</li>
            </ul>
          </section>

          <section className="legal-section" id="acceptable">
            <h2 className="legal-section-title">Acceptable Use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations.</li>
              <li>Upload, transmit, or distribute malicious code, viruses, or harmful content.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or other users&apos; accounts.</li>
              <li>Engage in scraping, crawling, or automated data extraction without written permission.</li>
              <li>Harass, threaten, or harm other users.</li>
              <li>Impersonate any person or entity.</li>
              <li>Use the Service for any illegal purpose including fraud, money laundering, or distribution of illegal content.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
            </ul>
          </section>

          <section className="legal-section" id="content">
            <h2 className="legal-section-title">Your Content</h2>
            <p>You retain ownership of all content you create within Jokel (&quot;User Content&quot;), including tasks, comments, attachments, and workspace data.</p>
            <p>By using the Service, you grant Jokel a limited, non-exclusive, royalty-free license to store, process, and display your User Content solely for the purpose of providing the Service to you.</p>
            <p>You represent that your User Content does not infringe any third-party intellectual property rights and does not violate any applicable laws.</p>
          </section>

          <section className="legal-section" id="ip">
            <h2 className="legal-section-title">Intellectual Property</h2>
            <p>The Jokel platform, including its software, design, logos, and documentation, is owned by Jokel and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.</p>
          </section>

          <section className="legal-section" id="privacy">
            <h2 className="legal-section-title">Privacy</h2>
            <p>Your use of the Service is governed by our <Link to="/privacy" style={{ color: 'var(--accent-blue)' }}>Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>
          </section>

          <section className="legal-section" id="security">
            <h2 className="legal-section-title">Security</h2>
            <p>We implement industry-standard security measures including bcrypt password hashing, JWT-based authentication, rate limiting, account lockout, comprehensive audit logging, and input sanitization.</p>
            <p>If you discover a security vulnerability, please report it responsibly to <a href="mailto:demo@demo.com" style={{ color: 'var(--accent-blue)' }}>demo@demo.com</a>.</p>
          </section>

          <section className="legal-section" id="termination">
            <h2 className="legal-section-title">Termination</h2>
            <p>You may terminate your account at any time via <strong>Settings → Danger Zone</strong>. Upon termination, your data will be deleted in accordance with our data retention policy.</p>
            <p>We may suspend or terminate your account immediately, without prior notice, if you violate these Terms, engage in fraudulent activity, or if required by law.</p>
          </section>

          <section className="legal-section" id="disclaimers">
            <h2 className="legal-section-title">Disclaimers</h2>
            <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
          </section>

          <section className="legal-section" id="liability">
            <h2 className="legal-section-title">Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, JOKEL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.</p>
            <p>IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE AMOUNT YOU PAID TO USE THE SERVICE IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR £100 (GBP), WHICHEVER IS GREATER.</p>
          </section>

          <section className="legal-section" id="governing">
            <h2 className="legal-section-title">Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          </section>

          <section className="legal-section" id="changes">
            <h2 className="legal-section-title">Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating the &quot;Last updated&quot; date and, for material changes, by providing in-app notification.</p>
          </section>

          <section className="legal-section" id="contact">
            <h2 className="legal-section-title">Contact</h2>
            <p>If you have questions about these Terms, please contact us:</p>
            <div className="legal-contact-grid">
              <div className="legal-contact-item">
                <div className="legal-contact-label">Legal questions</div>
                <a href="mailto:demo@demo.com">demo@demo.com</a>
                <p>General terms and legal inquiries</p>
              </div>
              <div className="legal-contact-item">
                <div className="legal-contact-label">Privacy requests</div>
                <a href="mailto:demo@demo.com">demo@demo.com</a>
                <p>GDPR and data protection requests</p>
              </div>
              <div className="legal-contact-item">
                <div className="legal-contact-label">Security issues</div>
                <a href="mailto:demo@demo.com">demo@demo.com</a>
                <p>Responsible disclosure and incidents</p>
              </div>
              <div className="legal-contact-item">
                <div className="legal-contact-label">Account support</div>
                <a href="mailto:demo@demo.com">demo@demo.com</a>
                <p>Account access and general support</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} Jokel. All rights reserved.</span>
        <div className="legal-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
