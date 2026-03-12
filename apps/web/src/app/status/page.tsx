import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';
import { StatusOverview } from '@/components/status/status-overview';

export const metadata: Metadata = {
  title: 'Status — DependWatch',
  description:
    'DependWatch platform status and reliability. Check service health and incident updates.',
};

export default function StatusPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Company</p>
          <h1>Status</h1>
          <p className="static-lead">
            If something’s wrong, check here first. This page shows a live health check of our API and database. We don’t show historical uptime yet; for incident updates or to report an outage, <Link href="/contact">contact us</Link>.
          </p>
        </header>

        <div className="static-body space-y-6">
          <StatusOverview />
          <p className="text-sm text-muted-foreground">
            For incident questions or to report an outage, use our <Link href="/contact">Contact</Link> page.
          </p>
        </div>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
