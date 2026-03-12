import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { ArrowRight } from 'lucide-react';

// Placeholder aggregated metrics for common APIs. Replace with real aggregation from DependWatch usage when available.
const PROVIDER_RELIABILITY = [
  {
    provider: 'OpenAI',
    slug: 'openai',
    uptime: 99.9,
    latencyP95Ms: 2100,
    errorRate: 0.4,
    description: 'Chat, embeddings, and fine-tuning',
  },
  {
    provider: 'Stripe',
    slug: 'stripe',
    uptime: 99.99,
    latencyP95Ms: 420,
    errorRate: 0.1,
    description: 'Payments and billing',
  },
  {
    provider: 'Twilio',
    slug: 'twilio',
    uptime: 99.95,
    latencyP95Ms: 680,
    errorRate: 0.2,
    description: 'SMS, voice, and messaging',
  },
  {
    provider: 'Resend',
    slug: 'resend',
    uptime: 99.9,
    latencyP95Ms: 380,
    errorRate: 0.2,
    description: 'Transactional email',
  },
];

export const metadata = {
  title: 'API reliability — DependWatch',
  description: 'Aggregated reliability and latency for popular APIs monitored by DependWatch.',
};

export default function ApiReliabilityPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40">
        <div className="container mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">◇</span>
            DependWatch
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/api-reliability" className="text-sm text-muted-foreground hover:text-foreground">
              API reliability
            </Link>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs
            </Link>
            <Link href="/login?signup=1">
              <Button size="sm">Start monitoring</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-16">
        <h1 className="text-3xl font-bold tracking-tight">API reliability</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Aggregated uptime, latency, and error rates for APIs commonly monitored with DependWatch.
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">
          Based on anonymized usage across DependWatch projects. Updated regularly.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PROVIDER_RELIABILITY.map((p) => (
            <Card key={p.slug} className="border-border/60 hover:border-border transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{p.provider}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uptime</p>
                    <p className="text-xl font-semibold tabular-nums text-success">{p.uptime}%</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">P95 latency</p>
                    <p className="text-xl font-semibold tabular-nums">{(p.latencyP95Ms / 1000).toFixed(2)}s</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Error rate</p>
                    <p className="text-xl font-semibold tabular-nums">{p.errorRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 rounded-lg border border-border/50 bg-muted/20 p-6">
          <h2 className="font-semibold">Monitor your own API dependencies</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Get latency, error rate, and cost visibility for every external API your product calls — OpenAI, Stripe, Twilio, Resend, and any HTTP API.
          </p>
          <Link href="/login?signup=1" className="mt-4 inline-block">
            <Button className="gap-2">
              Start monitoring your APIs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
