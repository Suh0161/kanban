import { Link } from 'react-router-dom';
import { PUBLIC_APP_HOST, PUBLIC_APP_URL } from '../../config/urls.js';
import LegalShell from './LegalShell.jsx';
import './legal.css';

const UPDATED = 'Last updated 20 May 2026';
const LEGAL_EMAIL = 'legal@arcnvd.com';

const TOC = [
  { id: 'agreement', label: 'Agreement' },
  { id: 'service', label: 'The service' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'conduct', label: 'Acceptable use' },
  { id: 'content', label: 'Content' },
  { id: 'ip', label: 'Intellectual property' },
  { id: 'availability', label: 'Availability' },
  { id: 'termination', label: 'Termination' },
  { id: 'liability', label: 'Liability' },
  { id: 'law', label: 'Governing law' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Legal"
      title="Terms of Service"
      lead="Terms governing access to and use of the Elevate service."
      updated={UPDATED}
      toc={TOC}
    >
      <section className="legal-section" id="agreement">
        <h2>Agreement</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) are a binding agreement between you and the
          operator of Elevate. By accessing or using the Service at{' '}
          <a href={PUBLIC_APP_URL}>{PUBLIC_APP_HOST}</a>, you agree to these Terms. If you do not
          agree, do not use the Service. You must be at least 16 years old and able to form a
          binding contract. If you use the Service on behalf of an organization, you represent that
          you have authority to bind that organization.
        </p>
      </section>

      <section className="legal-section" id="service">
        <h2>The service</h2>
        <p>
          Elevate is a software service for workspace and work-item management. Features, limits,
          and availability may change. We may suspend access for maintenance, security, or legal
          reasons. Hosted Service is provided on an &quot;as is&quot; and &quot;as available&quot;
          basis except where applicable law provides otherwise.
        </p>
      </section>

      <section className="legal-section" id="accounts">
        <h2>Accounts</h2>
        <p>
          You must provide accurate registration information and keep credentials confidential. You
          are responsible for activity under your account, including actions by workspace members
          you authorize. Notify us promptly if you believe your account has been compromised.
        </p>
      </section>

      <section className="legal-section" id="conduct">
        <h2>Acceptable use</h2>
        <p>
          You may not use the Service to violate law, infringe others&apos; rights, distribute
          malware, attempt unauthorized access, interfere with operation of the Service, or
          automate access in a manner that burdens our systems without permission. We may investigate
          and take action on violations, including suspension or termination.
        </p>
      </section>

      <section className="legal-section" id="content">
        <h2>Content</h2>
        <p>
          You retain ownership of content you submit. You grant us a limited license to host,
          store, process, and display your content solely to provide the Service to you and
          authorized workspace members. You are responsible for ensuring you have rights to the
          content you submit and for compliance obligations that apply to your data.
        </p>
      </section>

      <section className="legal-section" id="ip">
        <h2>Intellectual property</h2>
        <p>
          We and our licensors own the Service, including software, branding, and documentation,
          subject to any open-source license that applies to components you receive when
          self-hosting. Except as expressly permitted, you may not copy, modify, distribute, or
          create derivative works of the Service.
        </p>
      </section>

      <section className="legal-section" id="availability">
        <h2>Availability</h2>
        <p>
          We do not guarantee uninterrupted or error-free operation. Planned maintenance and
          unplanned outages may occur. Paid support or uptime commitments, if any, are set out in a
          separate order or agreement.
        </p>
      </section>

      <section className="legal-section" id="termination">
        <h2>Termination</h2>
        <p>
          You may stop using the Service and close your account at any time. We may suspend or
          terminate access for breach of these Terms, risk to the Service or other users, or as
          required by law. Upon termination, your right to use the Service ends; data handling is
          described in our <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section className="legal-section" id="liability">
        <h2>Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED. WE
          ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
          FOR LOST PROFITS OR DATA. OUR AGGREGATE LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE
          IS LIMITED TO THE GREATER OF FEES YOU PAID US IN THE TWELVE MONTHS BEFORE THE CLAIM OR
          ONE HUNDRED U.S. DOLLARS. SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE
          CASES, OUR LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.
        </p>
      </section>

      <section className="legal-section" id="law">
        <h2>Governing law</h2>
        <p>
          These Terms are governed by the laws of England and Wales, without regard to conflict-of-law
          principles. Courts in England and Wales have exclusive jurisdiction, except that either
          party may seek injunctive relief in any court of competent jurisdiction. We may update
          these Terms by posting a revised version and updating the date above; continued use after
          the effective date constitutes acceptance where permitted by law.
        </p>
      </section>

      <section className="legal-section" id="contact">
        <h2>Contact</h2>
        <p>
          Questions about these Terms: <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
      </section>
    </LegalShell>
  );
}
