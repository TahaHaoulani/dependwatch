import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPageLayout } from '@/components/marketing/static-page-layout';
import { MessageSquare, BookOpen, Activity, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support — DependWatch',
  description:
    'Get help with DependWatch: documentation, contact, and status. We respond within 1–2 business days.',
};

const supportChannels = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Quickstart, SDK setup, guardrails, and MCP integration.',
    href: '/docs',
    cta: 'View docs',
  },
  {
    icon: MessageSquare,
    title: 'Contact us',
    description: 'Product questions, billing, or technical support.',
    href: '/contact',
    cta: 'Contact',
  },
  {
    icon: Activity,
    title: 'Status',
    description: 'Check platform health and incident updates.',
    href: '/status',
    cta: 'View status',
  },
];

export default function SupportPage() {
  return (
    <StaticPageLayout>
      <article className="static-article">
        <header className="static-header">
          <p className="static-label">Company</p>
          <h1>Support</h1>
          <p className="static-lead">
            Docs, contact, and status in one place. We’re a small team; we typically reply within a couple of business days.
          </p>
        </header>

        <div className="static-body grid gap-5 sm:gap-6">
          {supportChannels.map((channel) => (
            <Link
              key={channel.href}
              href={channel.href}
              className="flex gap-4 rounded-xl border border-border/50 bg-card/50 p-5 transition-colors hover:border-border hover:bg-muted/10 sm:p-6"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <channel.icon className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-foreground">{channel.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  {channel.cta}
                  <ArrowRight className="h-4 w-4 opacity-70" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <footer className="static-article-footer">
          <Link href="/">← Back to DependWatch</Link>
        </footer>
      </article>
    </StaticPageLayout>
  );
}
