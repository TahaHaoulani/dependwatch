import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';

export const metadata: Metadata = {
  title: 'Acceptable Use Policy — DependWatch',
  description:
    'Rules for using DependWatch: no abuse, illegal use, or misuse of alerts and integrations. API observability platform usage policy.',
};

export default function AcceptableUsePage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Legal</p>
          <h1>Acceptable Use Policy</h1>
          <p className="static-lead">
            Last updated: March 2025. Your use of DependWatch must comply with this policy. Violations may result in suspension or termination of your account.
          </p>
        </header>

        <section className="static-section">
          <h2>Abusive or harmful use</h2>
          <p>
            You may not use DependWatch to conduct or facilitate illegal activity, fraud, or abuse. You may not use the service to send malicious traffic, to attempt to gain unauthorized access to our systems or any third-party systems, or to interfere with the availability or security of DependWatch or other services.
          </p>
        </section>

        <section className="static-section">
          <h2>Platform misuse</h2>
          <p>
            DependWatch is for API observability only. Using the ingest API or SDK as a general-purpose logging or analytics sink for unrelated traffic is not permitted. You may not reverse engineer, circumvent rate limits, or abuse shared infrastructure in a way that impacts other users.
          </p>
        </section>

        <section className="static-section">
          <h2>Alerts and integrations</h2>
          <p>
            Slack and other alert channels are for legitimate incident and guardrail notifications. You may not use them for spam, harassment, or unsolicited messaging. You are responsible for ensuring that alert destinations (webhooks, Slack workspaces, and any other channels we support) are appropriate and that you have permission to send messages to them.
          </p>
        </section>

        <section className="static-section">
          <h2>Scraping and automation</h2>
          <p>
            Automated access to our web application or APIs must comply with these terms and our rate limits. Scraping or automated collection of content or user data from DependWatch for purposes other than your own use of the service is not permitted without our prior written consent.
          </p>
        </section>

        <section className="static-section">
          <h2>Enforcement</h2>
          <p>
            We may investigate suspected violations and may suspend or terminate access, remove content, or take other action we deem appropriate. We may also report illegal activity to authorities. If you become aware of a violation, please contact us at <a href="mailto:abuse@dependwatch.app">abuse@dependwatch.app</a> or through our <Link href="/contact">Contact</Link> page.
          </p>
        </section>

        <section className="static-section">
          <h2>Changes</h2>
          <p>
            We may update this policy from time to time. The updated version will be posted on this page with a revised &quot;Last updated&quot; date. Continued use of DependWatch after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
