import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { PartnerLogo } from '@/components/landing/partner-logo';
import { UsageEstimator } from '@/components/pricing/usage-estimator';
import { TypicalUsage } from '@/components/pricing/typical-usage';

// Aligned with lib/pricing-capabilities.ts, lib/stripe.ts, lib/pricing-constants.ts
// Overage: Free hard cap; Pro $5/100k, Scale $3/100k (billed at period end).
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    subtitle: 'Perfect for side projects and early experimentation.',
    bestFor: 'Side projects, trials, 1–2 APIs',
    upgradeWhen: 'You need more than 2 APIs, more than 7-day history, or Slack alerts.',
    eventsIncluded: '10,000',
    overage: 'Hard cap (no paid overage)',
    apis: '2 APIs',
    retention: '7-day history',
    alerts: '1 alert rule (no Slack)',
    features: [
      '2 monitored APIs (distinct providers)',
      '7-day event history',
      '1 alert rule (no Slack webhooks)',
      'Provider-level dashboard',
      'Projected spend in dashboard',
      'Test events & SDK integration',
    ],
    cta: 'Start monitoring your APIs',
    href: '/login?signup=1',
    highlighted: false,
  },
  {
    id: 'builder',
    name: 'Pro',
    price: 29,
    subtitle: 'For production SaaS monitoring critical APIs.',
    bestFor: 'Production apps, 3–10 APIs, guardrails',
    upgradeWhen: 'You need team collaboration, unlimited Slack webhooks, 1-year history, or unlimited APIs.',
    badge: 'Most popular',
    eventsIncluded: '100,000',
    overage: '$5 per 100k events',
    apis: '10 APIs',
    retention: '90-day history',
    alerts: 'Slack alerts (3 webhooks)',
    features: [
      '10 monitored APIs',
      '90-day event history',
      '10 alert rules, 3 Slack webhooks',
      'Operation-level analytics',
      'API Intelligence (cost drivers, reliability, slow endpoints)',
      'Guardrails: cost, error, latency spike',
      'Dependency map (reliability & cost per provider)',
      'Projected cost & cost-spike detection',
      'SDK + MCP / AI assistant integration',
    ],
    cta: 'Start Pro monitoring',
    href: '/login?signup=1',
    highlighted: true,
  },
  {
    id: 'startup',
    name: 'Scale',
    price: 99,
    subtitle: 'For teams operating multiple services and needing full observability over every external API and tool their software depends on.',
    upgradeWhen: 'Very high event volume, many services, or organization-wide monitoring.',
    eventsIncluded: '1,000,000',
    overage: '$3 per 100k events',
    apis: 'Unlimited APIs',
    retention: '365-day history',
    alerts: 'Slack alerts (unlimited)',
    features: [
      'Unlimited APIs',
      '365-day event history',
      'Unlimited alert rules & Slack webhooks',
      'Anomaly detection',
      'Team workspace',
      'Dependency map & everything in Pro',
      'SDK + MCP / AI assistant integration',
    ],
    cta: 'Start Scale plan',
    href: '/login?signup=1',
    highlighted: false,
  },
];

const trustPartners = [
  { name: 'OpenAI', domain: 'openai.com' },
  { name: 'Anthropic', domain: 'anthropic.com' },
  { name: 'Mistral AI', domain: 'mistral.ai' },
  { name: 'Google', domain: 'google.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Cohere', domain: 'cohere.com' },
  { name: 'Groq', domain: 'groq.com' },
  { name: 'Together', domain: 'together.ai' },
  { name: 'Stripe', domain: 'stripe.com' },
  { name: 'AWS', domain: 'aws.amazon.com' },
  { name: 'PostgreSQL', domain: 'postgresql.org' },
  { name: 'MongoDB', domain: 'mongodb.com' },
  { name: 'Redis', domain: 'redis.io' },
  { name: 'Hugging Face', domain: 'huggingface.co' },
  { name: 'Twilio', domain: 'twilio.com' },
  { name: 'Resend', domain: 'resend.com' },
  { name: 'SendGrid', domain: 'sendgrid.com' },
  { name: 'Supabase', domain: 'supabase.com' },
  { name: 'Clerk', domain: 'clerk.com' },
];

const comparisonRows: [string, string, string, string][] = [
  ['Events included', '10,000', '100,000', '1,000,000'],
  ['Overage', 'Hard cap', '$5/100k events', '$3/100k events'],
  ['APIs monitored', '2', '10', 'Unlimited'],
  ['Event history', '7 days', '90 days', '365 days'],
  ['Alert rules', '1', '10', 'Unlimited'],
  ['Slack webhooks', '0', '3', 'Unlimited'],
  ['Provider-level analytics', 'Yes', 'Yes', 'Yes'],
  ['Operation-level analytics', '—', 'Yes', 'Yes'],
  ['API Intelligence (insights)', '—', 'Yes', 'Yes'],
  ['Guardrails (cost, error, latency spike)', '—', 'Yes', 'Yes'],
  ['Traffic anomaly detection', '—', '—', 'Yes'],
  ['Dependency map', '—', 'Yes', 'Yes'],
  ['Projected cost & cost-spike detection', 'Dashboard only', 'Yes', 'Yes'],
  ['Team workspace', '—', '—', 'Yes'],
  ['Test event onboarding', 'Yes', 'Yes', 'Yes'],
  ['SDK integration', 'Yes', 'Yes', 'Yes'],
  ['MCP / AI assistant integration', 'Yes', 'Yes', 'Yes'],
];

const faqs: { q: string; a: string }[] = [
  {
    q: 'What counts as an event?',
    a: 'One event = one tracked external API call. Each time your app calls wrap() or track() and sends data to DependWatch, that’s one event. Batched requests count as multiple events (one per call in the batch).',
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. Upgrade or downgrade from your workspace Billing page. Changes take effect at the next billing cycle; we don’t prorate mid-cycle for simplicity.',
  },
  {
    q: 'Do you charge overages?',
    a: 'Pro and Scale plans: usage over your included events is billed at $5/100k (Pro) or $3/100k (Scale) and added to your next invoice. Free plan has a hard cap with no paid overage. Billable usage excludes test/demo events. See Billing for your current period usage.',
  },
  {
    q: 'Can I monitor multiple services?',
    a: 'Yes. Each project can send events from one or many services (same ingest key). APIs monitored = distinct providers (e.g. OpenAI, Stripe) you send events for. Scale has unlimited APIs; Free caps at 2, Pro at 10.',
  },
  {
    q: 'How do alerts work?',
    a: 'Free: 1 alert rule, no Slack. Pro: 10 rules, 3 Slack webhooks. Scale: unlimited rules and webhooks. Configure thresholds (latency, error rate, budget) in Project → Settings → Alerts. Alerts fire when a threshold is exceeded and are sent to your Slack webhooks; cooldown reduces noise.',
  },
  {
    q: 'How accurate is cost forecasting?',
    a: 'Projected monthly spend is extrapolated from your events: (total cost in period / days in period) × 30. Accuracy depends on you sending estimated_cost_usd per call where applicable. We use it for trends and guardrails, not invoicing third-party APIs.',
  },
];

export default async function PricingPage() {
  const session = await auth();
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader isAuthenticated={!!session?.user} />

      <main className="container mx-auto max-w-5xl px-4 py-20 md:py-28">
        {/* Hero */}
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pricing</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl lg:leading-tight">
            Simple, predictable
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-base text-muted-foreground">
            Built for SaaS and integrations—and the APIs your AI agents call. Free: 2 APIs, 7-day history. Pro: production guardrails, dependency map. Scale: teams, Slack, anomaly detection. No long-term contracts.
          </p>
          <p className="mt-3 text-xs text-muted-foreground/90">
            Upgrade or downgrade from Billing. No lock-in.
          </p>
        </div>

        {/* Estimate your API monitoring usage */}
        <div className="mt-14">
          <UsageEstimator />
        </div>

        {/* Typical DependWatch usage */}
        <TypicalUsage />

        {/* Pricing cards */}
        <div className="mt-16 grid gap-6 sm:gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col transition-all hover:shadow-md ${
                plan.highlighted
                  ? 'border-primary shadow-lg shadow-primary/5 md:scale-[1.02]'
                  : 'border-border/60 hover:border-border'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    {plan.badge}
                  </span>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
                <CardDescription className="mt-1.5 text-sm leading-relaxed">
                  {plan.subtitle}
                </CardDescription>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/90">
                  Best for: {plan.bestFor}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                  {plan.price > 0 && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">{plan.eventsIncluded}</span> events included</p>
                  <p className="text-muted-foreground/90">{plan.overage}</p>
                  <p>{plan.apis} · {plan.retention}</p>
                  <p>{plan.alerts}</p>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-5">
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm leading-snug">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs font-medium text-foreground">Upgrade when</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {plan.upgradeWhen}
                  </p>
                </div>
                <div className="mt-auto pt-4">
                  <Link href={plan.href} className="block">
                    <Button
                      className="w-full transition-colors"
                      variant={plan.highlighted ? 'default' : 'outline'}
                      size="lg"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reassurance: overage is clear and billed at period end */}
        <div className="mt-8 rounded-xl border border-border/50 bg-muted/10 px-5 py-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">DependWatch never stops monitoring your APIs.</strong> Pro and Scale: overage billed at period end at the rates above. Free: hard cap, no overage charge. Real API events only—test/demo excluded from billing.
          </p>
        </div>

        {/* Usage-based explanation */}
        <div className="mt-6 rounded-xl border border-border/50 bg-muted/10 px-5 py-4">
          <p className="text-sm font-medium text-foreground">What counts as an event?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            One event = one tracked external API call. Most SaaS products generate between <strong className="text-foreground">10k and 200k API calls per month</strong> depending on traffic. Free (10k) fits side projects and low-volume apps; Pro (100k) fits typical production; Scale (1M) fits high-traffic or multi-service setups.
          </p>
        </div>

        {/* What counts as an API */}
        <div className="mt-6 rounded-xl border border-border/50 bg-muted/10 px-5 py-4">
          <p className="text-sm font-medium text-foreground">What counts as an API monitored?</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            An API monitored = a distinct external provider you send events for (e.g. OpenAI, Stripe, Twilio). We count unique providers per project. Operation-level tracking (e.g. openai.chat.completions, stripe.paymentIntents.create) happens inside each provider and does not increase the API count.
          </p>
        </div>

        {/* Full comparison table */}
        <div className="mt-16">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Feature comparison</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything included in each plan.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-border/50 shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-4 px-5 font-semibold text-foreground min-w-[200px]">Feature</th>
                  <th className="text-left py-4 px-5 font-semibold text-foreground">Free</th>
                  <th className="text-left py-4 px-5 font-semibold text-foreground">Pro ($29/mo)</th>
                  <th className="text-left py-4 px-5 font-semibold text-foreground">Scale ($99/mo)</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row[0]}
                    className={`border-b border-border/40 last:border-0 ${i % 2 === 1 ? 'bg-muted/15' : ''}`}
                  >
                    <td className="py-3.5 px-5 font-medium text-foreground">{row[0]}</td>
                    <td className="py-3.5 px-5">{row[1]}</td>
                    <td className="py-3.5 px-5">{row[2]}</td>
                    <td className="py-3.5 px-5">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Why upgrade (compact) */}
        <div className="mt-14 rounded-2xl border border-border/50 bg-muted/10 px-6 py-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Why teams upgrade</h2>
          <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
            <li><strong className="text-foreground">Free → Pro:</strong> More than 2 APIs, more than 7-day history, or need for cost-spike guardrails and operation-level analytics.</li>
            <li><strong className="text-foreground">Pro → Scale:</strong> Team collaboration, Slack alerts, 1-year history, or unlimited APIs. Scale adds anomaly detection.</li>
          </ul>
        </div>

        {/* Trust: Built for modern API-driven stacks */}
        <section className="mt-20 border-t border-border/40 pt-16">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Built for modern API-driven stacks. SaaS. Integrations. The APIs your AI agents call.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16 md:gap-x-20">
            {trustPartners.map(({ name, domain }) => (
              <PartnerLogo key={domain} name={name} domain={domain} />
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground/90 max-w-xl mx-auto">
            The observability layer for products that depend on these providers—and any other HTTP API.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-20 border-t border-border/40 pt-16">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Frequently asked questions</h2>
          <dl className="mt-8 space-y-8">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <dt className="text-sm font-medium text-foreground">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-16 text-center text-xs text-muted-foreground">
          All plans include latency and error metrics. No lock-in. Keys hashed; we never log request bodies.
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
