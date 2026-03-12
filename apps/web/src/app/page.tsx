import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { Button } from '@/components/ui/button';
import { TrackedLink } from '@/components/analytics/tracked-link';
import { AnalyticsEvents } from '@/lib/posthog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Check, Zap, Activity, BarChart3, Shield, TrendingUp, DollarSign, Key, Bot, AlertTriangle, Layers, Radio } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { HeroDashboardPreview } from '@/components/landing/hero-dashboard-preview';
import { HowItWorksCode } from '@/components/landing/how-it-works-code';
import { AnimateInView } from '@/components/landing/animate-in-view';
import { ApiEcosystemBar } from '@/components/landing/api-ecosystem-bar';
import { RealIncidentFeed } from '@/components/landing/real-incident-feed';
import { WaitlistForm } from '@/components/landing/waitlist-form';
import { PROVIDER_CATEGORIES, getProviderDomain } from '@/lib/provider-registry';
import { getLandingCopy, isWaitlistMode } from '@/lib/landing-mode';

/** Ecosystem bar order: Auth & Identity first (high impact), then AI, Payments, Messaging, Cloud. */
const apiEcosystemProviders = (() => {
  const byCategory = (ids: string[]) =>
    ids.map((id) => {
      const cat = PROVIDER_CATEGORIES.flatMap((c) => c.providers).find((p) => p.id === id);
      return cat ? { name: cat.label, domain: getProviderDomain(id) } : null;
    }).filter(Boolean) as { name: string; domain: string }[];
  return [
    ...byCategory(['clerk', 'auth0', 'supabase', 'firebase', 'cognito', 'okta']),
    ...byCategory(['openai', 'anthropic', 'mistral', 'google-gemini', 'cohere', 'stripe', 'twilio', 'resend']),
    ...byCategory(['aws', 'google-cloud', 'azure', 'cloudflare', 'algolia', 'github', 'vercel']),
  ];
})();

/** @deprecated Use apiEcosystemProviders. Kept for backwards compatibility. */
const trustPartners = apiEcosystemProviders;

// Aligned with lib/pricing-capabilities.ts and pricing page. CTA labels/href come from getLandingCopy().
const pricingPlans = [
  {
    name: 'Free',
    price: 0,
    desc: 'Side projects and early experimentation.',
    bestFor: 'Side projects, trials, 1–2 APIs',
    events: '10,000',
    overage: 'Hard cap (no charge)',
    apis: '2',
    retention: '7 days',
    alerts: '1 rule (no Slack)',
    features: ['2 APIs monitored', '7-day history', '1 alert rule', 'Provider-level dashboard'],
    whyUpgrade: 'More APIs, Slack alerts, operation-level analytics, API Intelligence, guardrails, or dependency map.',
    ctaKey: 'pricingCtaFree' as const,
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 29,
    desc: 'Production SaaS. Critical APIs.',
    bestFor: 'Production apps, 3–10 APIs, guardrails',
    badge: 'Most popular',
    events: '100,000',
    overage: 'Tracked only',
    apis: '10',
    retention: '90 days',
    alerts: 'Slack (3 webhooks)',
    features: ['10 APIs', '90-day history', 'Slack alerts', 'Guardrails', 'Operation-level analytics', 'API Intelligence', 'Dependency map'],
    whyUpgrade: 'Unlimited Slack, 1-year history, anomaly detection, or unlimited APIs.',
    ctaKey: 'pricingCtaPro' as const,
    highlighted: true,
  },
  {
    name: 'Scale',
    price: 99,
    desc: 'Teams. Multiple services. Full observability.',
    bestFor: 'Teams, unlimited APIs, Slack, anomaly detection',
    events: '1,000,000',
    overage: '$3/100k events',
    apis: 'Unlimited',
    retention: '365 days',
    alerts: 'Slack (unlimited)',
    features: ['Unlimited APIs', '1-year history', 'Slack + anomaly detection', 'Dependency map', 'Everything in Pro'],
    whyUpgrade: null,
    ctaKey: 'pricingCtaScale' as const,
    highlighted: false,
  },
];

// Real incident scenarios DependWatch detects (not generic categories)
const incidentScenarios = [
  {
    title: 'OpenAI cost spikes',
    description: 'Prompt inflation and retry storms. Before your bill explodes.',
    signals: ['cost anomaly detected', 'error rate increased'],
  },
  {
    title: 'Stripe checkout failures',
    description: 'PaymentIntent errors and latency regressions. Before customers abandon.',
    signals: ['error rate increased', 'latency spike detected'],
  },
  {
    title: 'Messaging reliability issues',
    description: 'Twilio and Resend delivery failures, rate limits. Caught early.',
    signals: ['error rate increased', 'latency spike detected'],
  },
  {
    title: 'Auth provider outages',
    description: 'Clerk, Auth0, Supabase Auth failures. Before users get locked out.',
    signals: ['error rate increased'],
  },
  {
    title: 'Agent workflow dependency failures',
    description: 'Workflows span OpenAI, Notion, Slack, internal APIs. See which dependency failed or spiked.',
    signals: ['error rate increased', 'latency spike detected'],
  },
];

/** Landing page. Session is read server-side only for navbar; no client useSession() or /api/auth/session. */
export default async function HomePage() {
  const session = await auth();
  const copy = getLandingCopy();
  const waitlistMode = isWaitlistMode();

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader isAuthenticated={!!session?.user} />

      <main>
        {/* ——— Hero ——— */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
          <div className="relative w-full px-4 pt-12 pb-24 md:px-6 md:pt-16 md:pb-32 lg:px-10 lg:pt-20 lg:pb-36 xl:px-12">
            <div className="grid gap-16 lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-center">
              <div className="text-center lg:max-w-xl lg:text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {copy.heroEyebrow}
                </p>
                <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance md:text-5xl lg:text-5xl xl:text-6xl lg:leading-[1.1]">
                  {copy.heroHeadline}
                </h1>
                <p className="mt-7 text-lg font-medium text-muted-foreground md:text-xl md:leading-relaxed">
                  {copy.heroSubcopy}
                </p>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground/90 lg:max-w-lg">
                  {copy.heroSubcopyExtra}
                </p>
                <div className="mt-12 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                  {waitlistMode ? (
                    <>
                      <WaitlistForm source="hero" variant="compact" id="waitlist" className="w-full max-w-md mx-auto lg:mx-0" />
                      <Link href={copy.heroCtaSecondaryHref}>
                        <Button size="lg" variant="outline" className="gap-2 transition-colors">
                          {copy.heroCtaSecondary}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <TrackedLink href="/login?signup=1" eventName={AnalyticsEvents.hero_cta_clicked} className="inline-block">
                        <Button size="lg" className="gap-2 shadow-lg transition-all hover:shadow-xl">
                          {copy.heroCtaPrimary}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TrackedLink>
                      <Link href={copy.heroCtaSecondaryHref}>
                        <Button size="lg" variant="outline" className="transition-colors">
                          {copy.heroCtaSecondary}
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <HeroDashboardPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ——— API ecosystem / trust ——— */}
        <section className="border-b border-border/40 bg-muted/20 py-10 md:py-12">
          <AnimateInView>
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground container mx-auto max-w-6xl px-4">
              Every API and tool your software depends on, including the ones your AI agents call
            </p>
            <div className="mt-6 md:mt-7 w-full overflow-hidden">
              <ApiEcosystemBar providers={apiEcosystemProviders} marquee />
            </div>
            <p className="mt-5 text-center text-xs text-muted-foreground/90 max-w-lg mx-auto px-4">
              Keys hashed. Data scoped to your project. No lock-in.
            </p>
          </AnimateInView>
        </section>

        {/* ——— Problem ——— */}
        <section className="border-b border-border/40 py-14 md:py-20 lg:py-24">
          <AnimateInView>
            <div className="w-full px-4 md:px-6 lg:px-10 xl:px-12">
              <div className="mx-auto max-w-3xl">
                <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">The problem</p>
                <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-balance md:text-4xl lg:text-[2.6rem] lg:leading-[1.2]">
                  Your product runs on APIs you don&apos;t control.
                </h2>
                <p className="mt-3 text-center text-base leading-relaxed text-muted-foreground md:text-lg">
                  Your product runs on APIs you don&apos;t control. So do your AI agents. Payments, messaging, AI, auth: all in third-party infrastructure. Most teams still treat them as invisible.
                </p>
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-3 max-w-5xl mx-auto">
                <AnimateInView delay={0} className="h-full">
                  <div className="group relative h-full rounded-2xl border border-border/50 bg-card/30 p-6 md:p-7 text-left transition-colors hover:border-border hover:bg-card/50 flex flex-col">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                      External dependencies everywhere
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
                      Products rely on dozens of external APIs for payments, messaging, AI, and auth. These are infrastructure, but rarely observed like it.
                    </p>
                  </div>
                </AnimateInView>
                <AnimateInView delay={50} className="h-full">
                  <div className="group relative h-full rounded-2xl border border-border/50 bg-card/30 p-6 md:p-7 text-left transition-colors hover:border-border hover:bg-card/50 flex flex-col">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Radio className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                      Failures propagate
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
                      One dependency fails; impact spreads. You find out from support tickets and outages, not from a control plane.
                    </p>
                  </div>
                </AnimateInView>
                <AnimateInView delay={100} className="h-full">
                  <div className="group relative h-full rounded-2xl border border-border/50 bg-card/30 p-6 md:p-7 text-left transition-colors hover:border-border hover:bg-card/50 flex flex-col">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                      Invisible costs
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground flex-1">
                      Usage grows quietly. Retry storms and high-cost endpoints burn budget before anyone notices.
                    </p>
                  </div>
                </AnimateInView>
              </div>

              <div className="mt-12 pt-8 border-t border-border/40 max-w-2xl mx-auto">
                <p className="text-center text-base font-medium text-foreground tracking-tight md:text-lg">
                  DependWatch gives you observability over every API and tool your software depends on, including the ones your AI agents call.
                </p>
              </div>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Real incidents feed ——— */}
        <section className="border-b border-border/40 bg-muted/20 py-14 md:py-20">
          <AnimateInView>
            <div className="container mx-auto max-w-2xl px-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                What we detect
              </p>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                The signals your team would see in production.
              </p>
              <div className="mt-8">
                <RealIncidentFeed />
              </div>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Why logs/APM miss this ——— */}
        <section className="border-b border-border/40 py-14 md:py-20">
          <AnimateInView>
            <div className="container mx-auto max-w-4xl px-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Why logs & APM miss this
              </p>
              <h2 className="mt-2 text-center text-2xl font-bold tracking-tight md:text-3xl">
                Built for the dependency layer
              </h2>
              <div className="mt-10 overflow-hidden rounded-xl border border-border/50 bg-card/50">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="px-5 py-4 font-semibold text-foreground">Problems detected</th>
                      <th className="px-5 py-4 font-medium text-muted-foreground">Logs / APM</th>
                      <th className="px-5 py-4 font-medium text-primary">DependWatch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    <tr className="transition-colors hover:bg-muted/10">
                      <td className="px-5 py-3.5 font-medium text-foreground">External API latency spikes</td>
                      <td className="px-5 py-3.5 text-muted-foreground">No</td>
                      <td className="px-5 py-3.5"><Check className="inline h-4 w-4 text-primary" /></td>
                    </tr>
                    <tr className="transition-colors hover:bg-muted/10">
                      <td className="px-5 py-3.5 font-medium text-foreground">Retry storms</td>
                      <td className="px-5 py-3.5 text-muted-foreground">No</td>
                      <td className="px-5 py-3.5"><Check className="inline h-4 w-4 text-primary" /></td>
                    </tr>
                    <tr className="transition-colors hover:bg-muted/10">
                      <td className="px-5 py-3.5 font-medium text-foreground">Cost explosions</td>
                      <td className="px-5 py-3.5 text-muted-foreground">No</td>
                      <td className="px-5 py-3.5"><Check className="inline h-4 w-4 text-primary" /></td>
                    </tr>
                    <tr className="transition-colors hover:bg-muted/10">
                      <td className="px-5 py-3.5 font-medium text-foreground">Provider outages</td>
                      <td className="px-5 py-3.5 text-muted-foreground">No</td>
                      <td className="px-5 py-3.5"><Check className="inline h-4 w-4 text-primary" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                APM and logs trace your code. DependWatch is the observability layer for the other side: every third-party API and tool your software depends on, including the ones your AI agents call. One place. Per provider. Per operation.
              </p>
              <p className="mt-3 text-center text-xs text-muted-foreground/90 max-w-xl mx-auto">
                One place to see and act on every external dependency. Visibility and signals, not runtime enforcement. That stays in your code.
              </p>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Insights examples ——— */}
        <section className="border-b border-border/40 bg-muted/20 py-14 md:py-20">
          <AnimateInView>
            <div className="container mx-auto max-w-5xl px-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Insights we generate
              </p>
              <h2 className="mt-2 text-center text-2xl font-bold tracking-tight md:text-3xl">
                From your traffic. No manual thresholds.
              </h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Slow endpoints', value: 'P95 > 2s', type: 'latency' },
                  { label: 'Cost spike', value: '>2.5× baseline', type: 'cost' },
                  { label: 'Retry storm', value: 'Traffic anomaly', type: 'traffic' },
                  { label: 'Provider degradation', value: 'Reliability drop', type: 'reliability' },
                ].map((insight, i) => (
                  <AnimateInView key={insight.label} delay={i * 50}>
                    <Card className="border-warning/20 bg-warning/5 transition-all hover:border-warning/30 hover:shadow-md hover:shadow-warning/5">
                      <CardHeader className="p-4">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-warning" />
                          <CardTitle className="text-sm font-semibold">{insight.label}</CardTitle>
                        </div>
                        <CardDescription className="text-xs font-medium tabular-nums text-muted-foreground">
                          {insight.value}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </AnimateInView>
                ))}
              </div>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Platform / features ——— */}
        <section id="features" className="scroll-mt-24 border-b border-border/40 bg-muted/20 py-20 md:py-28">
          <div className="container mx-auto max-w-6xl px-4">
            <AnimateInView>
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Platform</p>
              <h2 className="mt-3 text-center text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl lg:leading-tight">
                Observability, API Intelligence, guardrails, dependency map
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">
                One control plane for every external API your software depends on: Stripe, Twilio, OpenAI, and the rest. Including the tools your AI agents call. Analytics, guardrails, dependency map. Plus patterns for retry and fallback in your code.
              </p>
            </AnimateInView>

            <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <AnimateInView>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">API observability</CardTitle>
                    <CardDescription className="leading-relaxed">
                      Track total calls, average latency, error rate, and projected monthly spend. Provider breakdown table (calls, P50/P95, errors, cost) and real-time event stream with recent API events and recent failures.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={50}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <BarChart3 className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">Operation-level analytics</CardTitle>
                    <CardDescription className="leading-relaxed">
                      <span className="text-muted-foreground/90">Pro and above.</span> Operations table by endpoint (e.g. <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">openai.chat.completions</code>, <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">stripe.paymentIntents.create</code>). Find slow, failing, or expensive operations, not just provider totals.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={100}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">API Intelligence</CardTitle>
                    <CardDescription className="leading-relaxed">
                      <span className="text-muted-foreground/90">Pro and above.</span> Auto-generated insights from real traffic: cost drivers, reliability issues (e.g. high error rate), slow endpoints (P95 &gt;2s), cost spike vs prior period. No manual dashboards or threshold config.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={150}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">Guardrails</CardTitle>
                    <CardDescription className="leading-relaxed">
                      <span className="text-muted-foreground/90">Pro and above.</span> Cost spike (&gt;2.5× prior period), error spike, latency spike (P95 &gt;2s), traffic anomaly (&gt;3× baseline). Scale adds anomaly detection. Automatic flags; no threshold config required.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={200}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">Dependency map</CardTitle>
                    <CardDescription className="leading-relaxed">
                      <span className="text-muted-foreground/90">Pro and above.</span> See every external provider and operation your project depends on: traffic, reliability score, latency, cost contribution. One view of your API dependency graph.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={250}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">Protection in code, visibility here</CardTitle>
                    <CardDescription className="leading-relaxed">
                      Guardrails surface anomalies so you know when to act. Retries, fallbacks, and circuit breakers live in your code; the docs describe patterns. We monitor; you enforce.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={300}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">Developer-ready onboarding</CardTitle>
                    <CardDescription className="leading-relaxed">
                      Create a project, copy your ingest key (<code className="rounded bg-muted/80 px-1 py-0.5 font-mono text-xs">DEPENDWATCH_INGEST_KEY</code>), send test events from the dashboard, and instrument your app with the SDK (<code className="rounded bg-muted/80 px-1 py-0.5 font-mono text-xs">wrap()</code>) in minutes. Key reveal, copy, and rotate in the UI.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
              <AnimateInView delay={350}>
                <Card className="h-full border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-base font-semibold tracking-tight">Connect your coding assistant</CardTitle>
                    <CardDescription className="leading-relaxed">
                      Use DependWatch from Cursor or Claude Code via MCP: search docs, list projects, send test events, and validate integration without leaving your editor.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </AnimateInView>
            </div>

            <AnimateInView delay={100}>
              <p className="mt-14 text-center text-sm text-muted-foreground">
                <span className="font-medium text-foreground">OpenAI</span>, <span className="font-medium text-foreground">Stripe</span>, <span className="font-medium text-foreground">Twilio</span>, <span className="font-medium text-foreground">Resend</span>, <span className="font-medium text-foreground">Clerk</span>, <span className="font-medium text-foreground">Supabase</span>, and any API or tool your software depends on, including the ones your AI agents call.
              </p>
            </AnimateInView>
          </div>
        </section>

        {/* ——— How it works ——— */}
        <section className="border-b border-border/40 py-20 md:py-28">
          <div className="container mx-auto max-w-4xl px-4">
            <AnimateInView>
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">How it works</p>
              <h2 className="mt-3 text-center text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl lg:leading-tight">
                Four steps to full visibility
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-base text-muted-foreground leading-relaxed">
                Project. SDK. wrap(). Dashboard. Events and guardrails appear automatically.
              </p>
            </AnimateInView>
            <div className="mt-24 space-y-24 md:space-y-28">
              <AnimateInView delay={0}>
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Create a project and copy your ingest key</h3>
                    <p className="mt-2 text-muted-foreground">
                      Sign in, create a workspace and project. Copy the ingest key (shown once) and set it as <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">DEPENDWATCH_INGEST_KEY</code>.
                    </p>
                  </div>
                </div>
              </AnimateInView>
              <AnimateInView delay={100}>
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                    2
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">Install the SDK</h3>
                    <p className="mt-2 text-muted-foreground">
                      Add the DependWatch Node SDK. One dependency, no agents or proxies.
                    </p>
                    <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-muted/30 px-5 py-4 font-mono text-sm ring-1 ring-black/5 shadow-sm">
                      npm install @dependwatch/sdk-node
                    </div>
                  </div>
                </div>
              </AnimateInView>
              <AnimateInView delay={200}>
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                    3
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold">Wrap your API calls</h3>
                    <p className="mt-2 text-muted-foreground">
                      Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">wrap()</code> around calls to OpenAI, Stripe, or any HTTP client. We record latency, status, and optional cost.
                    </p>
                    <div className="mt-4">
                      <HowItWorksCode />
                    </div>
                  </div>
                </div>
              </AnimateInView>
              <AnimateInView delay={300}>
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-12">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight">Watch events, insights, and guardrails in DependWatch</h3>
                    <p className="mt-3 leading-relaxed text-muted-foreground">
                      Events are batched and sent automatically. Your dashboard shows volume, latency percentiles, error rates, projected cost, and auto-generated insights and guardrail alerts.
                    </p>
                  </div>
                </div>
              </AnimateInView>
            </div>
          </div>
        </section>

        {/* ——— 10 lines ——— */}
        <section className="border-b border-border/40 bg-muted/20 py-16 md:py-24">
          <AnimateInView>
            <div className="container mx-auto max-w-5xl px-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Developer proof
              </p>
              <h2 className="mt-3 text-center text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
                10 lines to instrument
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
                Wrap calls. We capture latency, errors, cost, anomalies.
              </p>
              <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
                <div className="min-w-0 flex-1 lg:min-w-[28rem]">
                  <HowItWorksCode />
                </div>
                <div className="shrink-0 lg:w-64">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Captured automatically
                  </p>
                  <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Activity className="h-4 w-4 shrink-0 text-primary" />
                      Latency (P50, P95)
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
                      Error rate
                    </li>
                    <li className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 shrink-0 text-primary" />
                      Cost (when you pass estimated_cost_usd)
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
                      Anomalies (spikes, retry storms)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Quick start ——— */}
        <section className="border-b border-border/40 py-20 md:py-28">
          <AnimateInView>
            <div className="container mx-auto max-w-3xl px-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Quick start</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl lg:leading-tight">
                First insight in under 2 minutes
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                Create a project. Send a test event (no code). See the dashboard. Then add the SDK and monitor real traffic from your backend, integrations, or the code behind your AI agents.
              </p>
              <TrackedLink href={copy.pricingCtaHref} eventName={AnalyticsEvents.section_cta_clicked} className="mt-8 inline-block">
                <Button size="lg" variant="outline" className="gap-2">
                  {copy.ctaQuickStart}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TrackedLink>
            </div>
          </AnimateInView>
        </section>

        {/* ——— MCP ——— */}
        <section className="border-b border-border/40 py-20 md:py-28">
          <AnimateInView>
            <div className="container mx-auto max-w-3xl px-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI integration</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl lg:leading-tight">
                DependWatch in Cursor & Claude Code
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                MCP: search docs, list projects, send test events from your editor. Token in Project → Connect assistant.
              </p>
              <Link href={copy.mcpCtaHref} className="mt-6 inline-block">
                <Button variant="outline" size="sm">
                  {copy.mcpCta}
                </Button>
              </Link>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Pricing ——— */}
        <section className="border-b border-border/40 py-20 md:py-28">
          <AnimateInView>
            <div className="container mx-auto max-w-5xl px-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Pricing</p>
              <h2 className="mt-3 text-center text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl lg:leading-tight">
                {copy.pricingSectionTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-center text-base text-muted-foreground">
                {copy.pricingSectionSubcopy}
              </p>
              <div className="mt-10 flex justify-center">
                <Link
                  href={waitlistMode ? '/#waitlist' : '/pricing'}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  {copy.ctaPricingCompare}
                </Link>
              </div>
              {copy.pricingIncentive && (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {copy.pricingIncentive}
                </p>
              )}
              <div className="mt-14 grid gap-6 md:grid-cols-3">
                {pricingPlans.map((plan) => (
                  <Card
                    key={plan.name}
                    className={`relative flex flex-col ${
                      plan.highlighted
                        ? 'border-primary shadow-lg shadow-primary/5 md:scale-[1.02]'
                        : ''
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
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription className="mt-1">{plan.desc}</CardDescription>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/90">
                        Best for: {plan.bestFor}
                      </p>
                      <div className="mt-6 flex items-baseline gap-1">
                        <span className="text-4xl font-bold tracking-tight">${plan.price}</span>
                        {plan.price > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-xs">
                        <span><span className="text-muted-foreground">Included:</span> <span className="font-medium tabular-nums">{plan.events}</span> events/mo</span>
                        <span><span className="text-muted-foreground">Overage:</span> <span className="font-medium">{plan.overage}</span></span>
                        <span><span className="text-muted-foreground">APIs:</span> <span className="font-medium">{plan.apis}</span></span>
                        <span><span className="text-muted-foreground">History:</span> <span className="font-medium">{plan.retention}</span></span>
                        <span><span className="text-muted-foreground">Alerts:</span> <span className="font-medium">{plan.alerts}</span></span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col space-y-4">
                      <ul className="space-y-2.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-3 text-sm">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                      {plan.whyUpgrade && (
                        <p className="text-xs text-muted-foreground border-t border-border/60 pt-3 mt-1">
                          <span className="font-medium text-foreground">Upgrade when:</span> {plan.whyUpgrade}
                        </p>
                      )}
                      <div className="mt-auto pt-4">
                        <Link href={copy.pricingCtaHref} className="block">
                          <Button
                            className="w-full"
                            variant={plan.highlighted ? 'default' : 'outline'}
                            size="lg"
                          >
                            {copy[plan.ctaKey]}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="mt-10 text-center text-xs text-muted-foreground">
                Upgrade or downgrade from Billing. No lock-in. <Link href="/pricing" className="font-medium text-foreground underline hover:no-underline">Full comparison →</Link>
              </p>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Incident scenarios ——— */}
        <section className="border-b border-border/40 bg-muted/20 py-16 md:py-24">
          <AnimateInView>
            <div className="container mx-auto max-w-5xl px-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Real problems, early</p>
              <h2 className="mt-2 text-center text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.25rem] lg:leading-tight text-balance">
                Catch API problems before they break your product
              </h2>
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {incidentScenarios.map((scenario, i) => (
                  <AnimateInView key={scenario.title} delay={i * 40} className="h-full">
                    <Card className="group h-full flex flex-col border-border/50 bg-background/80 transition-all hover:border-border hover:shadow-md hover:shadow-black/5">
                      <CardHeader className="p-6 md:p-7 flex-1 flex flex-col">
                        <div className="flex items-start gap-3 flex-1">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/50 text-muted-foreground group-hover:border-border group-hover:bg-muted/80">
                            <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                          </span>
                          <div className="min-w-0 flex-1 space-y-2 flex flex-col">
                            <CardTitle className="text-base font-semibold leading-tight tracking-tight md:text-[15px]">
                              {scenario.title}
                            </CardTitle>
                            <CardDescription className="text-sm leading-relaxed flex-1">
                              {scenario.description}
                            </CardDescription>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {scenario.signals.map((signal) => (
                                <span
                                  key={signal}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-warning/20 bg-warning/5 px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-warning"
                                >
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                                  {signal}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </AnimateInView>
                ))}
              </div>
              <p className="mt-12 text-center text-sm leading-relaxed text-muted-foreground max-w-2xl mx-auto">
                DependWatch surfaces them automatically: every API and tool your product depends on, including the ones your AI agents call.
              </p>
            </div>
          </AnimateInView>
        </section>

        {/* ——— Final CTA ——— */}
        <section className="py-24 md:py-32">
          <AnimateInView>
            <div className="container mx-auto max-w-3xl px-4 text-center">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl lg:leading-tight">
                {copy.finalCtaHeadline}
              </h2>
              <p className="mt-4 text-base text-muted-foreground">
                {copy.finalCtaSubcopy}
              </p>
              <TrackedLink href={copy.finalCtaHref} eventName={AnalyticsEvents.section_cta_clicked} className="mt-8 inline-block">
                <Button size="lg" className="gap-2 shadow-lg transition-all hover:shadow-xl">
                  {copy.finalCtaButton}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TrackedLink>
            </div>
          </AnimateInView>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
