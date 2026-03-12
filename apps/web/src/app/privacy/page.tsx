import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';

export const metadata: Metadata = {
  title: 'Privacy Policy — DependWatch',
  description:
    'How DependWatch collects, uses, and protects your data. Account, workspace, telemetry, and security practices for our API observability platform.',
};

const navItems = [
  { id: 'collect', label: 'What we collect' },
  { id: 'use', label: 'How we use it' },
  { id: 'retention', label: 'Retention' },
  { id: 'sharing', label: 'Sharing' },
  { id: 'security', label: 'Security' },
  { id: 'rights', label: 'Your rights' },
  { id: 'changes', label: 'Changes' },
];

export default function PrivacyPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="static-lead">
            Last updated: March 2025. DependWatch provides external API observability, cost monitoring, and guardrails. This policy describes how we handle your information.
          </p>
          <nav aria-label="On this page" className="static-nav">
            <p className="static-nav-title">On this page</p>
            <ul>
              {navItems.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <section id="collect" className="static-section">
          <h2>1. What we collect</h2>
          <ul>
            <li>
              <strong>Account information:</strong> When you sign up (e.g. via Google, GitHub, or email), we store your email, name (if provided), and authentication identifiers. We use this to manage your account and sessions.
            </li>
            <li>
              <strong>Workspace and project data:</strong> Names and settings for workspaces and projects you create, including ingest key metadata (e.g. key IDs and hashes). We do not store raw ingest keys in plain text; keys are hashed for verification.
            </li>
            <li>
              <strong>Event and telemetry data:</strong> Data sent by the DependWatch SDK from your application: provider name, endpoint, latency, status codes, optional cost estimates, and similar operational metrics. This data is scoped to your project and used to power the dashboard, API Intelligence, and guardrails.
            </li>
            <li>
              <strong>Cookies and session data:</strong> We use session cookies and similar technologies to keep you signed in and to remember preferences (e.g. theme). Session data is used only for authentication and security.
            </li>
            <li>
              <strong>Billing information:</strong> If you subscribe to a paid plan, payment and billing details are processed by Stripe. We store subscription status and plan identifiers; we do not store full payment card numbers.
            </li>
          </ul>
        </section>

        <section id="use" className="static-section">
          <h2>2. How we use your data</h2>
          <p>
            We use the data above to provide and operate DependWatch: to authenticate you, to store and display your projects and metrics, to run guardrails and alerts, to send transactional emails (e.g. magic links, security and product notifications), and to improve our service (e.g. reliability, performance). We do not sell your personal data.
          </p>
        </section>

        <section id="retention" className="static-section">
          <h2>3. Retention</h2>
          <p>
            Event and telemetry data are retained according to your plan (e.g. 7 days for Free, 90 days for Pro, 365 days for Scale). Account and workspace data are retained while your account is active. After account closure, we may retain certain data for a limited period for legal and operational purposes; you can request deletion (see below).
          </p>
        </section>

        <section id="sharing" className="static-section">
          <h2>4. Sharing and subprocessors</h2>
          <p>
            We use service providers to run DependWatch: hosting and infrastructure, authentication (e.g. OAuth providers), email delivery, and payment processing (Stripe). These providers process data on our behalf under agreements that limit use to providing the service. We may disclose information if required by law or to protect our rights and safety.
          </p>
        </section>

        <section id="security" className="static-section">
          <h2>5. Security</h2>
          <p>
            We use TLS for all traffic, HTTP-only session cookies, and access controls. Ingest keys are hashed; we do not store or log raw keys or request bodies. For more detail, see our <Link href="/security">Security</Link> page.
          </p>
        </section>

        <section id="rights" className="static-section">
          <h2>6. Your rights and contact</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, or delete your personal data. To exercise these or ask questions about this policy, contact us at <a href="mailto:privacy@dependwatch.app">privacy@dependwatch.app</a> or via our <Link href="/contact">Contact</Link> page. We aim to respond within a few business days.
          </p>
        </section>

        <section id="changes" className="static-section">
          <h2>7. Changes</h2>
          <p>
            We may update this policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot; date. Continued use of DependWatch after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
