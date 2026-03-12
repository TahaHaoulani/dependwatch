import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';

export const metadata: Metadata = {
  title: 'Cookies & Data Usage — DependWatch',
  description:
    'How DependWatch uses cookies and similar technologies for authentication and preferences.',
};

export default function CookiesPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Legal</p>
          <h1>Cookies & data usage</h1>
          <p className="static-lead">
            Last updated: March 2025. This page summarizes how DependWatch uses cookies and similar technologies. For full details on data we collect and how we use it, see our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </header>

        <section className="static-section">
          <h2>Cookies we use</h2>
          <p>We use cookies and similar storage (e.g. localStorage) for:</p>
          <ul>
            <li>
              <strong>Authentication:</strong> Session cookies so you stay signed in. These are essential for using the product.
            </li>
            <li>
              <strong>Preferences:</strong> We store your theme choice (e.g. light, dark, system) so the site respects your preference across visits.
            </li>
          </ul>
          <p>
            We do not use cookies for advertising or third-party tracking. We do not sell cookie-derived data.
          </p>
        </section>

        <section className="static-section">
          <h2>Event and telemetry data</h2>
          <p>
            When you use the DependWatch SDK in your application, event data (provider, endpoint, latency, status, optional cost) is sent to our ingest API. That data is used to power your dashboard, API Intelligence, and guardrails. It is not used for advertising. Details are in our <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </section>

        <section className="static-section">
          <h2>Your choices</h2>
          <p>
            You can clear cookies in your browser settings; that will log you out and reset preferences (e.g. theme). Questions about how we use data? See our <Link href="/privacy">Privacy Policy</Link> or <Link href="/contact">Contact</Link> page.
          </p>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
