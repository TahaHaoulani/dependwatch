import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';
import { ContactForm } from '@/components/contact/contact-form';
import { Mail, MessageSquare, Shield, Briefcase, BookOpen, Activity } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — DependWatch',
  description:
    'Get in touch with DependWatch: support, product, security, and partnership inquiries. We respond within 1–2 business days.',
};

const contactCategories = [
  {
    icon: MessageSquare,
    title: 'Product & support',
    description: 'Questions about the product, onboarding, billing, or technical issues.',
    email: 'support@dependwatch.app',
    label: 'support@dependwatch.app',
  },
  {
    icon: Shield,
    title: 'Security & privacy',
    description: 'Security vulnerabilities, privacy requests, or data questions.',
    email: 'security@dependwatch.app',
    label: 'security@dependwatch.app',
  },
  {
    icon: Briefcase,
    title: 'Partnerships & sales',
    description: 'Enterprise, partnerships, or custom plans.',
    email: 'hello@dependwatch.app',
    label: 'hello@dependwatch.app',
  },
];

export default function ContactPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Company</p>
          <h1>Contact</h1>
          <p className="static-lead">
            We’re a small team. Pick the topic below or use the form; we read every message and typically reply within a couple of business days. We don’t use your email for marketing.
          </p>
        </header>

        <section className="static-section">
          <h2>Get in touch by topic</h2>
          <div className="mt-4 grid gap-4">
            {contactCategories.map((cat) => (
              <div
                key={cat.email}
                className="flex gap-3 rounded-lg border border-border/50 bg-card/50 p-4 transition-colors hover:border-border sm:gap-4 sm:p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <cat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-foreground">{cat.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p>
                  <a
                    href={`mailto:${cat.email}`}
                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {cat.label}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="static-section">
          <h2>Send a message</h2>
          <p>Use the form below. Choose a topic so we can prioritize; we’ll reply to the email you provide.</p>
          <div className="mt-4">
            <ContactForm />
          </div>
        </section>

        <section className="static-section rounded-lg border border-border/50 bg-muted/20 p-5">
          <h2 className="!mb-2 text-base">Helpful links</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/docs" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <BookOpen className="h-4 w-4" />
                Documentation
              </Link>
            </li>
            <li>
              <Link href="/status" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                <Activity className="h-4 w-4" />
                Status
              </Link>
            </li>
            <li>
              <Link href="/security" className="text-primary hover:underline">
                Security
              </Link>
            </li>
          </ul>
        </section>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
