'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProviderIcon } from '@/components/dashboard/provider-icon';

const providers = [
  { name: 'OpenAI', slug: 'openai', latency: '2.1s', errors: '0.8%', cost: '$3,240', status: 'warning' as const },
  { name: 'Stripe', slug: 'stripe', latency: '450ms', errors: '0.1%', cost: '—', status: 'ok' as const },
  { name: 'Twilio', slug: 'twilio', latency: '980ms', errors: '1.2%', cost: '$420', status: 'warning' as const },
];

const kpis = [
  { label: 'Total calls', value: '12,447' },
  { label: 'Avg latency', value: '1.2s' },
  { label: 'Error rate', value: '0.6%' },
  { label: 'Projected', value: '$3,720' },
];

// Line chart: x 0–100, y 0–100 (y from bottom)
const linePoints = [
  [0, 35], [12, 52], [25, 48], [37, 68], [50, 55], [62, 72], [75, 62], [87, 78], [100, 70],
];

export function HeroDashboardPreview() {
  const pathD = linePoints
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${100 - y}`)
    .join(' ');
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div
      className="relative mx-auto w-full max-w-4xl animate-scale-in"
      style={{ animationDelay: '200ms', animationFillMode: 'both' }}
    >
      <div
        className="absolute -inset-6 rounded-3xl opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, hsl(var(--primary) / 0.12), transparent 65%)',
        }}
      />
      <div className="relative">
        {/* Window chrome */}
        <div className="rounded-t-xl border border-b-0 border-border/50 bg-muted/30 px-4 py-2.5 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500/60" />
              <div className="h-2 w-2 rounded-full bg-amber-500/60" />
              <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
            </div>
            <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
              <span className="text-muted-foreground/60">https://</span>
              app.dependwatch.app/dashboard
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              Live
            </span>
          </div>
        </div>

        <Card className="overflow-hidden rounded-t-none border-border/50 bg-card shadow-2xl shadow-black/20 dark:shadow-black/30 ring-1 ring-border/30">
          <CardHeader className="space-y-0 border-b border-border/50 pb-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Overview</h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">Last 24 hours</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {kpis.map((k) => (
                  <span
                    key={k.label}
                    className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5 font-mono text-[11px] font-medium tabular-nums text-foreground/90"
                  >
                    {k.value}
                    <span className="ml-1 font-sans text-[10px] font-normal normal-case text-muted-foreground">{k.label}</span>
                  </span>
                ))}
                <span className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
                  Cost spike · OpenAI
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pb-5 pt-4">
            {/* Chart */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Call volume
              </p>
              <div className="relative h-[64px] w-full rounded-lg bg-muted/20 p-2">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                  <defs>
                    <linearGradient id="heroChartGrad" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#heroChartGrad)" />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                </svg>
              </div>
            </div>

            {/* By provider table */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                By provider
              </p>
              <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/10">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Provider
                      </th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
                        p95
                      </th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
                        Errors
                      </th>
                      <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider tabular-nums text-muted-foreground">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {providers.map((row) => (
                      <tr key={row.name} className="border-b border-border/30 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          <span className="inline-flex items-center gap-2">
                            <ProviderIcon name={row.slug} size={16} className="shrink-0" />
                            {row.name}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                          {row.latency}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span
                            className={`font-mono tabular-nums ${
                              row.status === 'warning' ? 'text-warning' : 'text-muted-foreground'
                            }`}
                          >
                            {row.errors}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                          {row.cost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Operations teaser */}
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Operations
              </p>
              <div className="rounded-lg border border-border/50 bg-muted/10 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                <span className="text-foreground/90">openai.chat.completions</span>
                <span className="mx-2 text-border">·</span>
                <span className="tabular-nums">2.1s P95</span>
                <span className="mx-2 text-border">·</span>
                <span>$2,840</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
