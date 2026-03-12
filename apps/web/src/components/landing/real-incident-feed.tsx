'use client';

import { AlertCircle } from 'lucide-react';
import { AnimateInView } from '@/components/landing/animate-in-view';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';

const incidents = [
  {
    title: 'OpenAI latency spike detected',
    detail: 'P95 latency increased 240% in the last 5 minutes.',
    provider: 'openai',
  },
  {
    title: 'Stripe paymentIntent failures',
    detail: 'Error rate increased from 0.2% to 3.8%.',
    provider: 'stripe',
  },
  {
    title: 'Twilio SMS retry storm',
    detail: 'Traffic anomaly detected across SMS sends.',
    provider: 'twilio',
  },
  {
    title: 'OpenAI cost anomaly',
    detail: 'Projected monthly spend increased by $430.',
    provider: 'openai',
  },
];

export function RealIncidentFeed() {
  return (
    <div className="space-y-3">
      {incidents.map((incident, i) => (
        <AnimateInView key={incident.title} delay={i * 80}>
          <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 transition-colors hover:border-warning/30 hover:bg-warning/10">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-warning/30 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                🚨 {incident.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {incident.detail}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <ProviderIcon name={incident.provider} size={14} className="shrink-0" />
              {providerDisplayName(incident.provider)}
            </span>
          </div>
        </AnimateInView>
      ))}
    </div>
  );
}
