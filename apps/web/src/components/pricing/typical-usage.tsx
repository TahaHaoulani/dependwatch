import { Card, CardContent, CardHeader } from '@/components/ui/card';

const scenarios = [
  {
    title: 'Side project / indie SaaS',
    apis: ['OpenAI', 'Resend'],
    usage: '5k–20k API calls/month',
    plan: 'Free',
    planPrice: null,
    explanation: 'Hobby projects, prototypes, small side tools.',
    badgeVariant: 'muted' as const,
  },
  {
    title: 'Early SaaS startup',
    apis: ['OpenAI', 'Stripe', 'Twilio'],
    usage: '30k–120k API calls/month',
    plan: 'Pro',
    planPrice: 29,
    explanation: 'Production SaaS: payments, AI inference, notifications.',
    badgeVariant: 'primary' as const,
  },
  {
    title: 'Production SaaS platform',
    apis: ['AI inference', 'Payments', 'Auth', 'Messaging', 'Internal APIs'],
    usage: '300k–1M+ API calls/month',
    plan: 'Scale',
    planPrice: 99,
    explanation: 'Teams running multiple services. Full observability over every API and tool their software depends on.',
    badgeVariant: 'accent' as const,
  },
];

export function TypicalUsage() {
  return (
    <section className="mt-14">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Typical DependWatch usage
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Realistic product scenarios and recommended plans.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {scenarios.map((s) => (
          <Card
            key={s.title}
            className={`relative flex flex-col transition-colors hover:shadow-md ${
              s.badgeVariant === 'primary'
                ? 'border-primary/40 bg-primary/[0.03] hover:border-primary/60'
                : s.badgeVariant === 'accent'
                  ? 'border-border/60 bg-muted/5 hover:border-border hover:bg-muted/10'
                  : 'border-border/60 bg-muted/5 hover:border-border hover:bg-muted/10'
            }`}
          >
            <div className="absolute right-3 top-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  s.badgeVariant === 'primary'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.plan}
              </span>
            </div>
            <CardHeader className="pb-2 pr-20">
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.apis.map((api) => (
                  <span
                    key={api}
                    className="inline-flex items-center rounded-md border border-border/50 bg-background/80 px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {api}
                  </span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 pt-0">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Typical usage:</span> {s.usage}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Recommended:</span>{' '}
                {s.plan}
                {s.planPrice != null && (
                  <span className="text-muted-foreground"> (${s.planPrice}/mo)</span>
                )}
              </p>
              <p className="mt-auto text-sm leading-snug text-muted-foreground">
                {s.explanation}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
