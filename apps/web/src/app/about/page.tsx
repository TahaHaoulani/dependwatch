import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';

export const metadata: Metadata = {
  title: 'About — DependWatch',
  description:
    'DependWatch is the control plane for external API observability: latency, cost, guardrails, and dependency visibility for modern SaaS.',
};

export default function AboutPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Company</p>
          <h1>About DependWatch</h1>
          <p className="static-lead">
            The control plane for the dependency layer: one place to see and protect every external API your product calls.
          </p>
        </header>

        <section className="static-section">
          <h2>What we do</h2>
          <p>
            DependWatch gives engineering teams observability over external APIs: latency, errors, projected cost, and auto-generated guardrails. We focus on the dependency layer — OpenAI, Stripe, Twilio, Resend, and any HTTP API your app depends on — with provider- and operation-level analytics, API Intelligence, and a dependency map. No generic APM; built for the APIs you don’t control.
          </p>
        </section>

        <section className="static-section">
          <h2>Who it’s for</h2>
          <p>
            Developers and teams shipping products that rely on third-party APIs. From side projects to production SaaS, DependWatch helps you catch degradation, cost spikes, and retry storms before they hit users or invoices. Integrate with a few lines of code; get visibility and guardrails without lock-in.
          </p>
        </section>

        <section className="static-section">
          <h2>Get in touch</h2>
          <p>
            Questions, feedback, or partnership inquiries: <Link href="/contact">Contact us</Link>. For security issues, see our <Link href="/security">Security</Link> page.
          </p>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
