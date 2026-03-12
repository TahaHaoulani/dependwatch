import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';

export const metadata: Metadata = {
  title: 'Terms of Service — DependWatch',
  description:
    'Terms of use for DependWatch: account responsibility, acceptable use, billing, and service limits for our API observability platform.',
};

const navItems = [
  { id: 'use', label: 'Use of service' },
  { id: 'account', label: 'Account' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'billing', label: 'Billing' },
  { id: 'limits', label: 'Limits' },
  { id: 'termination', label: 'Termination' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Liability' },
  { id: 'changes', label: 'Changes' },
  { id: 'contact', label: 'Contact' },
];

export default function TermsPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Legal</p>
          <h1>Terms of Service</h1>
          <p className="static-lead">
            Last updated: March 2025. By using DependWatch you agree to these terms. If you use the service on behalf of an organization, you represent that you have authority to bind that organization.
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

        <section id="use" className="static-section">
          <h2>1. Use of the service</h2>
          <p>
            DependWatch provides a control plane for external API observability: you instrument your applications with our SDK, we ingest event data and provide dashboards, insights, guardrails, and alerts. You must use the service in compliance with these terms and with applicable law. You are responsible for the data you send to us and for keeping your ingest keys and account credentials secure.
          </p>
        </section>

        <section id="account" className="static-section">
          <h2>2. Account responsibility</h2>
          <p>
            You are responsible for all activity under your account. You must provide accurate information when signing up and keep your contact details current. You must not share account or ingest keys with unauthorized parties. If you believe your account or keys have been compromised, notify us promptly and rotate keys via the dashboard.
          </p>
        </section>

        <section id="acceptable-use" className="static-section">
          <h2>3. Acceptable use</h2>
          <p>
            You must not use DependWatch to conduct or facilitate illegal activity, to send abusive or harmful traffic, to attempt to gain unauthorized access to our or others&apos; systems, or to misuse alerts or integrations (e.g. spam, harassment). Additional rules are in our <Link href="/acceptable-use">Acceptable Use Policy</Link>. We may suspend or terminate access for violations.
          </p>
        </section>

        <section id="billing" className="static-section">
          <h2>4. Billing and subscriptions</h2>
          <p>
            Paid plans are billed in advance (e.g. monthly or annually). Fees are non-refundable except where required by law or as stated in our pricing. Pro and Scale plans include a monthly event allowance; usage above that allowance (overage) is billed at the rates shown on the <Link href="/pricing">Pricing</Link> page and added to your next invoice. The Free plan has a hard event cap with no paid overage. You may upgrade or downgrade from the Billing section of your dashboard; changes take effect as described there.
          </p>
        </section>

        <section id="limits" className="static-section">
          <h2>5. Plan limits and availability</h2>
          <p>
            Your use is subject to the limits of your plan (e.g. number of APIs, events per month, retention period). We use reasonable efforts to keep the service available but do not guarantee uptime. We may change plan features or limits with notice; we will not materially reduce the value of your current plan during your billing period without notice.
          </p>
        </section>

        <section id="termination" className="static-section">
          <h2>6. Suspension and termination</h2>
          <p>
            We may suspend or terminate your access if you breach these terms, our Acceptable Use Policy, or for operational or legal reasons. You may close your account at any time from account settings. Upon termination, your right to use the service ends; we may retain data as described in our Privacy Policy.
          </p>
        </section>

        <section id="disclaimers" className="static-section">
          <h2>7. Disclaimers</h2>
          <p>
            The service is provided &quot;as is.&quot; We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose. We do not guarantee that DependWatch will meet all of your requirements or be error-free. You use the service at your own risk.
          </p>
        </section>

        <section id="liability" className="static-section">
          <h2>8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages, or for loss of data, revenue, or profits, arising from your use of the service. Our total liability for any claims arising from or related to the service is limited to the amount you paid us in the twelve months preceding the claim (or one hundred dollars if greater).
          </p>
        </section>

        <section id="changes" className="static-section">
          <h2>9. Changes to the service and terms</h2>
          <p>
            We may change the service or these terms. We will post updated terms on this page and update the &quot;Last updated&quot; date. Material changes to terms that affect your rights will be communicated (e.g. by email or in-app notice) where practicable. Continued use after changes constitutes acceptance. If you do not agree, you must stop using the service and may close your account.
          </p>
        </section>

        <section id="contact" className="static-section">
          <h2>10. Contact</h2>
          <p>
            For questions about these terms, contact us at <a href="mailto:legal@dependwatch.app">legal@dependwatch.app</a> or through our <Link href="/contact">Contact</Link> page.
          </p>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
