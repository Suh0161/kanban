import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Logo } from '../../ui';
import './css/legal.css';

const TOC = [
  { id: 'overview',     label: 'Overview' },
  { id: 'data-collect', label: 'Data We Collect' },
  { id: 'data-use',     label: 'How We Use Data' },
  { id: 'data-share',   label: 'Data Sharing' },
  { id: 'security',     label: 'Security' },
  { id: 'retention',    label: 'Data Retention' },
  { id: 'rights',       label: 'Your Rights (GDPR)' },
  { id: 'cookies',      label: 'Cookies & Storage' },
  { id: 'children',     label: "Children's Privacy" },
  { id: 'changes',      label: 'Policy Changes' },
  { id: 'contact',      label: 'Contact Us' },
];

export default function PrivacyPage() {
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
          <Logo size={20} className="legal-nav-brand-icon" />
          <span>Elevate</span>
        </Link>
        <Link to="/" className="legal-nav-back">
          <ArrowLeft size={13} /> Back to sign in
        </Link>
      </nav>

      <div className="legal-shell">
        {/* Sidebar */}
        <aside className="legal-sidebar">
          <div className="legal-sidebar-inner">
            <p className="legal-sidebar-title">Privacy Policy</p>
            <ul className="legal-toc">
              {TOC.map(({ id, label }) => (
                <li key={id} className={activeId === id ? 'active' : ''}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Content */}
        <main className="legal-main">
          <div className="legal-badge"><ShieldCheck size={12} /> GDPR Compliant</div>
          <h1 className="legal-title">Privacy Policy</h1>
          <div className="legal-meta">
            <span>Effective May 17, 2026</span>
            <span className="legal-meta-sep">·</span>
            <span>Last updated May 17, 2026</span>
          </div>

          <section className="legal-section" id="overview">
            <h2 className="legal-section-title">Overview</h2>
            <p>Elevate is committed to protecting your personal data. This Privacy Policy explains how we collect, use, store, and protect information when you use the Elevate workspace management platform.</p>
            <p>This policy applies to all users of Elevate and complies with the General Data Protection Regulation (GDPR), the UK GDPR, and other applicable data protection laws.</p>
            <div className="legal-callout">
              <div className="legal-callout-dot" />
              <p><strong>Plain English:</strong> We collect only what we need to run the service. We don&apos;t sell your data. You can request deletion at any time via Settings → Danger Zone.</p>
            </div>
          </section>

          <section className="legal-section" id="data-collect">
            <h2 className="legal-section-title">Data We Collect</h2>
            <p>We collect the following categories of personal data:</p>
            <ul>
              <li><strong>Account data</strong> — Name, email address, and hashed password when you register.</li>
              <li><strong>Profile data</strong> — Display name and avatar image you choose.</li>
              <li><strong>Workspace data</strong> — Tasks, comments, attachments, and other content you create within Elevate.</li>
              <li><strong>Usage data</strong> — Activity logs, login timestamps, and feature usage for security and audit purposes.</li>
              <li><strong>Technical data</strong> — IP address, browser type, and session tokens for authentication and security.</li>
            </ul>
            <p>We do <strong>not</strong> collect payment information, location data, or any sensitive personal data as defined under GDPR Article 9.</p>
          </section>

          <section className="legal-section" id="data-use">
            <h2 className="legal-section-title">How We Use Your Data</h2>
            <p>We process your personal data for the following purposes and legal bases:</p>
            <ul>
              <li><strong>Service delivery</strong> (Contract) — To provide, maintain, and improve the Elevate platform.</li>
              <li><strong>Authentication</strong> (Contract) — To verify your identity and secure your account.</li>
              <li><strong>Security & fraud prevention</strong> (Legitimate interest) — To detect and prevent unauthorized access and security incidents.</li>
              <li><strong>Audit logging</strong> (Legitimate interest / Legal obligation) — To maintain records of workspace activity for compliance.</li>
              <li><strong>Service communications</strong> (Contract) — To send essential notifications about your account.</li>
              <li><strong>Legal compliance</strong> (Legal obligation) — To comply with applicable laws and regulations.</li>
            </ul>
            <p>We do <strong>not</strong> use your data for advertising, profiling, or automated decision-making that produces legal effects.</p>
          </section>

          <section className="legal-section" id="data-share">
            <h2 className="legal-section-title">Data Sharing</h2>
            <p>We do not sell, rent, or trade your personal data. We may share data only in these limited circumstances:</p>
            <ul>
              <li><strong>Within your workspace</strong> — Your name and avatar are visible to other members of workspaces you join.</li>
              <li><strong>Service providers</strong> — Trusted third-party processors bound by data processing agreements.</li>
              <li><strong>Legal requirements</strong> — If required by law, court order, or to protect user safety.</li>
              <li><strong>Business transfers</strong> — In the event of a merger or acquisition, with prior notice to you.</li>
            </ul>
          </section>

          <section className="legal-section" id="security">
            <h2 className="legal-section-title">Security</h2>
            <p>We implement industry-standard security measures to protect your data:</p>
            <div className="legal-grid">
              <div className="legal-grid-item">
                <strong>bcrypt password hashing</strong>
                <span>Passwords hashed with cost factor 12. Never stored in plain text.</span>
              </div>
              <div className="legal-grid-item">
                <strong>JWT sessions</strong>
                <span>7-day token expiry with secure local storage.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Rate limiting</strong>
                <span>Account lockout after 5 failed login attempts.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Audit logging</strong>
                <span>All significant actions logged with timestamps and user IDs.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Signed attachment URLs</strong>
                <span>Files served via signed tokens to prevent unauthorized access.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Input sanitization</strong>
                <span>All inputs sanitized to prevent injection attacks.</span>
              </div>
            </div>
            <p>While we implement industry-standard measures, no system is 100% secure. We encourage you to use a strong, unique password.</p>
          </section>

          <section className="legal-section" id="retention">
            <h2 className="legal-section-title">Data Retention</h2>
            <p>We retain your personal data for as long as your account is active or as needed to provide the service:</p>
            <ul>
              <li><strong>Account data</strong> — Retained until you delete your account.</li>
              <li><strong>Workspace content</strong> — Retained until the workspace is deleted.</li>
              <li><strong>Archived tasks</strong> — Automatically purged after 30 days.</li>
              <li><strong>Activity logs</strong> — Retained for 90 days for security purposes.</li>
              <li><strong>Backups</strong> — May be retained for up to 30 days after deletion for disaster recovery.</li>
            </ul>
            <p>You can delete your account and all associated data at any time via <strong>Settings → Danger Zone</strong>.</p>
          </section>

          <section className="legal-section" id="rights">
            <h2 className="legal-section-title">Your Rights Under GDPR</h2>
            <p>If you are located in the EEA or UK, you have the following rights:</p>
            <div className="legal-grid">
              <div className="legal-grid-item">
                <strong>Right of access (Art. 15)</strong>
                <span>Request a copy of the personal data we hold about you.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Right to rectification (Art. 16)</strong>
                <span>Correct inaccurate data via your Profile settings.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Right to erasure (Art. 17)</strong>
                <span>Request deletion of your account and all associated data.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Right to restriction (Art. 18)</strong>
                <span>Request that we limit processing in certain circumstances.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Right to portability (Art. 20)</strong>
                <span>Request your data in a machine-readable format.</span>
              </div>
              <div className="legal-grid-item">
                <strong>Right to object (Art. 21)</strong>
                <span>Object to processing based on legitimate interests.</span>
              </div>
            </div>
            <p>To exercise any of these rights, contact us at <a href="mailto:demo@demo.com" style={{ color: 'var(--accent-blue)' }}>demo@demo.com</a>. We will respond within 30 days.</p>
          </section>

          <section className="legal-section" id="cookies">
            <h2 className="legal-section-title">Cookies & Local Storage</h2>
            <p>Elevate uses browser local storage (not cookies) to store:</p>
            <ul>
              <li><code>Elevate-token</code> — Your JWT session token for authentication.</li>
              <li><code>Elevate-auth</code> — Your profile data cache to avoid repeated API calls.</li>
              <li><strong>UI preferences</strong> — Sidebar state and active view, stored per workspace.</li>
            </ul>
            <p>We do <strong>not</strong> use tracking cookies, advertising cookies, or third-party analytics.</p>
          </section>

          <section className="legal-section" id="children">
            <h2 className="legal-section-title">Children&apos;s Privacy</h2>
            <p>Elevate is not directed at children under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us immediately and we will delete it.</p>
          </section>

          <section className="legal-section" id="changes">
            <h2 className="legal-section-title">Policy Changes</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the &quot;Last updated&quot; date. For material changes, we will provide additional notice such as an in-app notification.</p>
          </section>

          <section className="legal-section" id="contact">
            <h2 className="legal-section-title">Contact Us</h2>
            <p>For privacy-related questions, data subject requests, or to report a concern:</p>
            <div className="legal-contact-grid">
              <div className="legal-contact-item">
                <div className="legal-contact-label">Privacy requests</div>
                <a href="mailto:demo@demo.com">demo@demo.com</a>
                <p>GDPR requests responded to within 30 days</p>
              </div>
              <div className="legal-contact-item">
                <div className="legal-contact-label">Security incidents</div>
                <a href="mailto:demo@demo.com">demo@demo.com</a>
                <p>Security issues responded to within 72 hours</p>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} Elevate. All rights reserved.</span>
        <div className="legal-footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
