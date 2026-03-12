'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRecommendedPlanId } from '@/lib/pricing-constants';

function parsePositiveInt(value: string, fallback: number): number {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return fallback;
  return Math.min(n, 99_999_999);
}

const examples = [
  { label: 'Side project', range: '~5k API calls/month', plan: 'Free' },
  { label: 'AI SaaS with OpenAI', range: '~40k API calls/month', plan: 'Pro' },
  { label: 'Production SaaS with payments + AI', range: '~300k API calls/month', plan: 'Scale' },
];

export function UsageEstimator() {
  const [monthlyUsers, setMonthlyUsers] = useState('500');
  const [sessionsPerUser, setSessionsPerUser] = useState('4');
  const [apiCallsPerSession, setApiCallsPerSession] = useState('20');

  const estimated = useMemo(() => {
    const u = parsePositiveInt(monthlyUsers, 500);
    const s = parsePositiveInt(sessionsPerUser, 4);
    const c = parsePositiveInt(apiCallsPerSession, 20);
    return u * s * c;
  }, [monthlyUsers, sessionsPerUser, apiCallsPerSession]);

  const recommendedPlan = useMemo(() => {
    const planId = getRecommendedPlanId(estimated);
    const display: Record<typeof planId, { name: string; tier: 'free' | 'pro' | 'scale' | 'enterprise' }> = {
      free: { name: 'Free', tier: 'free' },
      builder: { name: 'Pro', tier: 'pro' },
      startup: { name: 'Scale', tier: 'scale' },
      enterprise: { name: 'Contact sales', tier: 'enterprise' },
    };
    return display[planId];
  }, [estimated]);

  const formattedEstimate = estimated.toLocaleString();

  return (
    <section className="rounded-xl border border-border/50 bg-muted/10 px-5 py-6 shadow-sm sm:px-6">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Estimate your API monitoring usage
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        See which plan fits your expected traffic. One event = one tracked API call.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="estimator-mau" className="text-foreground">
            Monthly active users
          </Label>
          <Input
            id="estimator-mau"
            type="number"
            min={0}
            max={99999999}
            value={monthlyUsers}
            onChange={(e) => setMonthlyUsers(e.target.value)}
            className="bg-background"
            aria-label="Monthly active users"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimator-sessions" className="text-foreground">
            Sessions per user per month
          </Label>
          <Input
            id="estimator-sessions"
            type="number"
            min={0}
            max={9999}
            value={sessionsPerUser}
            onChange={(e) => setSessionsPerUser(e.target.value)}
            className="bg-background"
            aria-label="Sessions per user per month"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimator-calls" className="text-foreground">
            API calls per session
          </Label>
          <Input
            id="estimator-calls"
            type="number"
            min={0}
            max={9999}
            value={apiCallsPerSession}
            onChange={(e) => setApiCallsPerSession(e.target.value)}
            className="bg-background"
            aria-label="Average API calls per user session"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border/40 bg-background/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm font-medium text-foreground">
          Estimated API calls monitored per month: <span className="tabular-nums text-foreground">{formattedEstimate}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Recommended plan:{' '}
          <span
            className={
              recommendedPlan.tier === 'free'
                ? 'font-medium text-foreground'
                : recommendedPlan.tier === 'pro'
                  ? 'font-medium text-primary'
                  : recommendedPlan.tier === 'scale'
                    ? 'font-medium text-foreground'
                    : 'font-medium text-warning'
            }
          >
            {recommendedPlan.name}
          </span>
        </p>
      </div>

      <div className="mt-6 border-t border-border/40 pt-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Example products
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {examples.map((ex) => (
            <li
              key={ex.label}
              className="rounded-lg border border-border/40 bg-background/30 px-3 py-2.5 text-sm"
            >
              <span className="font-medium text-foreground">{ex.label}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">{ex.range} → {ex.plan}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
