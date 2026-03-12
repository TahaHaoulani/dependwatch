import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';
import { Shield, Key, Lock, Server, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Security — DependWatch',
  description:
    'How DependWatch handles ingest keys, authentication, data access, and transport security for our API observability platform.',
};

const iconClass = 'h-5 w-5 shrink-0 text-primary';

export default function SecurityPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Company</p>
          <h1>Security</h1>
          <p className="static-lead">
            How we handle ingest keys, authentication, data access, and how to report vulnerabilities.
          </p>
        </header>

        <section className="static-section flex gap-3 sm:gap-4">
          <Key className={iconClass} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2>Ingest keys and tokens</h2>
            <p>
              Your project ingest key (<code>DEPENDWATCH_INGEST_KEY</code>) is used to authenticate event ingestion from the SDK. We store a hash of the key for verification; we do not store or log the raw key. Keys are shown in full only once at creation or rotation — copy and store them in your environment or secrets manager. Never commit keys to source control or expose them in client-side code. You can rotate keys at any time from Project → Settings → Ingest API keys; the previous key is invalidated immediately.
            </p>
            <p>
              MCP tokens (for Cursor or other assistants) can be created and revoked in the dashboard. Treat them like secrets; anyone with a token can read project metadata and send test events for that project.
            </p>
          </div>
        </section>

        <section className="static-section flex gap-3 sm:gap-4">
          <Lock className={iconClass} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2>Environment and configuration</h2>
            <p>
              We recommend keeping the ingest key and any sensitive configuration in environment variables or a secrets manager. The SDK is designed for server-side use only; do not use it in browser or mobile code where the key could be exposed. Our documentation describes safe patterns for initialization and wrapping API calls.
            </p>
          </div>
        </section>

        <section className="static-section flex gap-3 sm:gap-4">
          <Shield className={iconClass} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2>Session and authentication</h2>
            <p>
              Web sessions use HTTP-only cookies. Sign-in is via OAuth (Google, GitHub) or magic-link email. Session data is only used to identify you and enforce access to your workspaces and projects. We do not use it for advertising or third-party tracking.
            </p>
          </div>
        </section>

        <section className="static-section flex gap-3 sm:gap-4">
          <Server className={iconClass} aria-hidden />
          <div className="min-w-0 flex-1">
            <h2>Data access boundaries</h2>
            <p>
              Event and project data are scoped by workspace and project. Only users with access to a workspace can see its projects and metrics. We do not use your event data to train models or for anything unrelated to running DependWatch. Only the small team that operates the service has access to production data.
            </p>
          </div>
        </section>

        <section className="static-section">
          <h2>Transport security</h2>
          <p>
            All traffic between your application and DependWatch, and between your browser and our web app, uses TLS (HTTPS). We do not log request bodies at the ingest endpoint; we process and store only the structured event payload (provider, endpoint, latency, status, optional cost) needed for the dashboard and guardrails.
          </p>
        </section>

        <section className="static-section rounded-lg border border-warning/20 bg-warning/5 p-5 md:p-6">
          <div className="flex gap-3 sm:gap-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0">
              <h2 className="!mt-0">Reporting vulnerabilities</h2>
              <p className="mt-3 text-sm leading-relaxed">
                If you find a security vulnerability, email <a href="mailto:security@dependwatch.app">security@dependwatch.app</a> with a description and steps to reproduce. We will acknowledge and work with you to fix it. Please do not disclose it publicly before we have a chance to respond. For general security or product questions, use our <Link href="/contact">Contact</Link> page.
              </p>
            </div>
          </div>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
