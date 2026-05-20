import { Link } from 'react-router-dom';
import { PUBLIC_APP_HOST, PUBLIC_APP_URL, PUBLIC_SITE_HOST, PUBLIC_SITE_URL } from '../../config/urls.js';
import LegalShell from './LegalShell.jsx';
import './legal.css';

const UPDATED = 'Last updated 20 May 2026';
const PRIVACY_EMAIL = 'privacy@arcnvd.com';
const SECURITY_EMAIL = 'security@arcnvd.com';

const TOC = [
  { id: 'scope', label: 'Scope' },
  { id: 'collect', label: 'Information we collect' },
  { id: 'use', label: 'How we use it' },
  { id: 'share', label: 'Disclosure' },
  { id: 'security', label: 'Security' },
  { id: 'retention', label: 'Retention' },
  { id: 'rights', label: 'Your rights' },
  { id: 'website', label: 'Marketing site' },
  { id: 'children', label: "Children's privacy" },
  { id: 'self-hosted', label: 'Self-hosted' },
  { id: 'contact', label: 'Contact' },
];

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Privacy Policy"
      lead="How we collect, use, and protect personal information when you use Elevate."
      updated={UPDATED}
      toc={TOC}
    >
      <section className="legal-section" id="scope">
        <h2>Scope</h2>
        <p>
          This Privacy Policy applies to the Elevate service offered at{' '}
          <a href={PUBLIC_APP_URL}>{PUBLIC_APP_HOST}</a> and related sites at{' '}
          <a href={PUBLIC_SITE_URL}>{PUBLIC_SITE_HOST}</a> (together, the &quot;Service&quot;). It
          describes our practices when we act as the data controller for hosted accounts. If you run
          a self-hosted instance, you may be the controller for data stored on your systems; see
          Self-hosted below.
        </p>
      </section>

      <section className="legal-section" id="collect">
        <h2>Information we collect</h2>
        <p>
          We collect information you provide directly (such as name, email address, and account
          credentials), workspace content you create (tasks, comments, and files you upload), and
          technical information generated when you use the Service (such as IP address, browser
          type, session identifiers, and security logs). If you sign in with a third-party identity
          provider, we receive the profile fields that provider shares according to your settings.
        </p>
      </section>

      <section className="legal-section" id="use">
        <h2>How we use it</h2>
        <p>
          We use personal information to operate and improve the Service, authenticate users,
          enforce security controls, deliver customer support, comply with law, and communicate
          about your account. We do not sell personal information. We do not use workspace content
          for third-party advertising.
        </p>
      </section>

      <section className="legal-section" id="share">
        <h2>Disclosure</h2>
        <p>
          We may disclose information to service providers that process data on our behalf under
          contractual safeguards, to other members of workspaces you join (limited to what the
          product displays, such as your name and avatar), when required by law, or to protect the
          rights, property, or safety of users and the public. A successor organization may receive
          information in connection with a merger or acquisition, subject to notice where required
          by law.
        </p>
      </section>

      <section className="legal-section" id="security">
        <h2>Security</h2>
        <p>
          We maintain administrative, technical, and organizational measures designed to protect
          personal information, including access controls, encryption in transit where supported,
          hashed credentials, and monitoring for abuse. No method of transmission or storage is
          completely secure. You are responsible for safeguarding your password and API keys.
        </p>
      </section>

      <section className="legal-section" id="retention">
        <h2>Retention</h2>
        <p>
          We retain personal information for as long as your account is active or as needed to
          provide the Service, resolve disputes, enforce agreements, and meet legal obligations.
          When you delete your account or workspace content, we delete or anonymize associated data
          within a reasonable period, except where backup copies may persist for a limited time for
          disaster recovery.
        </p>
      </section>

      <section className="legal-section" id="rights">
        <h2>Your rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, restrict, or
          port your personal information, and to object to certain processing. You may exercise
          these rights by contacting us or through account settings where available. You may also
          lodge a complaint with a supervisory authority. We will respond to verified requests
          within the time required by applicable law.
        </p>
      </section>

      <section className="legal-section" id="website">
        <h2>Marketing site</h2>
        <p>
          Pages at <a href={PUBLIC_SITE_URL}>{PUBLIC_SITE_HOST}</a> (this marketing site) do not
          require an account. We store your light or dark theme preference in browser local storage
          under the key <code>elevate-website-theme</code> so your choice persists across visits. We
          do not use that key for advertising or cross-site tracking.
        </p>
        <p>
          Typography is loaded from Google Fonts (<code>fonts.googleapis.com</code> and{' '}
          <code>fonts.gstatic.com</code>). When your browser requests those assets, Google may
          receive technical data such as your IP address according to its policies. We do not embed
          third-party analytics, advertising pixels, or similar trackers on this site.
        </p>
      </section>

      <section className="legal-section" id="children">
        <h2>Children&apos;s privacy</h2>
        <p>
          Elevate is not directed at children under 16. We do not knowingly collect personal
          information from children. If you believe a child has provided us with personal
          information, contact{' '}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> and we will delete it.
        </p>
      </section>

      <section className="legal-section" id="self-hosted">
        <h2>Self-hosted</h2>
        <p>
          If you deploy Elevate on infrastructure you control, you determine the lawful basis and
          retention for data stored in that environment. This policy does not govern processing you
          perform as operator of your own deployment.
        </p>
      </section>

      <section className="legal-section" id="contact">
        <h2>Contact</h2>
        <p>
          Privacy inquiries and data subject requests:{' '}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. Security reports:{' '}
          <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a>. See also our{' '}
          <Link to="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalShell>
  );
}
