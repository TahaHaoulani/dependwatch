'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatNumber, formatPercent } from '@/lib/utils';
import { AlertTriangle, Loader2, Share2, Github, ClipboardList } from 'lucide-react';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import type { GuardrailAlert } from './dashboard-types';
import { operationLabel } from './dashboard-types';
import { useToast } from '@/components/ui/use-toast';

function GuardrailShareButtons({
  projectId,
  alert,
  toastFn,
}: {
  projectId: string;
  alert: GuardrailAlert;
  toastFn: (p: { title: string; description?: string; variant?: 'destructive' | 'default' }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const share = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/incidents/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardrail: alert }),
      });
      if (!res.ok) throw new Error('Failed to share');
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      toastFn({
        title: 'Link copied to clipboard',
        description: 'Public incident link is ready to share.',
      });
    } catch {
      toastFn({ title: 'Could not create share link' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={share} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
      Share incident
    </Button>
  );
}

function guardrailToGitHubMarkdown(alert: GuardrailAlert): string {
  const provider = providerDisplayName(alert.provider);
  const op = operationLabel(alert.provider, 'endpoint' in alert ? alert.endpoint : undefined);
  let body = `## DependWatch incident\n\n`;
  body += `| Field | Value |\n|-------|-------|\n`;
  body += `| **Provider** | ${provider} |\n`;
  if ('endpoint' in alert && alert.endpoint)
    body += `| **Endpoint** | \`${alert.endpoint}\` |\n`;
  body += `| **Detection** | ${alert.type.replace('_', ' ')} |\n`;
  if (alert.type === 'cost_spike')
    body += `| **Increase** | +${Math.round((alert.increase - 1) * 100)}% vs baseline |\n`;
  if (alert.type === 'error_spike')
    body += `| **Error rate** | ${(alert.errorRate * 100).toFixed(2)}% |\n`;
  if (alert.type === 'latency_spike')
    body += `| **P95 latency** | ${(alert.p95Ms / 1000).toFixed(1)}s |\n`;
  if (alert.type === 'traffic_anomaly')
    body += `| **Calls** | ${alert.currentCalls} (${(alert.currentCalls / alert.baselineCalls).toFixed(1)}× baseline) |\n`;
  body += `\n_Automatically detected by [DependWatch](https://dependwatch.app)._`;
  return body;
}

function GuardrailGitHubIssueButton({
  alert,
  toastFn,
}: {
  alert: GuardrailAlert;
  toastFn: (p: { title: string; description?: string; variant?: 'destructive' | 'default' }) => void;
}) {
  const copy = async () => {
    const md = guardrailToGitHubMarkdown(alert);
    await navigator.clipboard.writeText(md);
    toastFn({ title: 'Markdown copied', description: 'Paste into a new GitHub issue.' });
  };
  return (
    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={copy}>
      <Github className="h-3.5 w-3.5" />
      Create GitHub issue
    </Button>
  );
}

function GuardrailTrackIncidentButton({
  projectId,
  alert,
  toastFn,
  onCreated,
}: {
  projectId: string;
  alert: GuardrailAlert;
  toastFn: (p: { title: string; description?: string; variant?: 'destructive' | 'default' }) => void;
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const track = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guardrail: alert }),
      });
      if (!res.ok) throw new Error('Failed');
      toastFn({ title: 'Incident created', description: 'Track status in Open incidents below.' });
      onCreated?.();
    } catch {
      toastFn({ title: 'Could not create incident', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={track} disabled={loading}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
      Track incident
    </Button>
  );
}

export function DashboardGuardrailsSection({
  projectId,
  guardrails,
  onIncidentCreated,
}: {
  projectId: string;
  guardrails: GuardrailAlert[] | null | undefined;
  onIncidentCreated?: () => void;
}) {
  const { toast } = useToast();

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Guardrails
        </CardTitle>
        <CardDescription>Detected anomalies — cost spikes, error spikes, slow endpoints, traffic</CardDescription>
      </CardHeader>
      <CardContent>
        {guardrails != null && guardrails.length > 0 ? (
          <ul className="space-y-2.5">
            {guardrails.map((alert, i) => (
              <li
                key={`${alert.type}-${alert.provider}-${i}`}
                className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2.5 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  {alert.type === 'cost_spike' && (
                    <>
                      <p className="font-medium text-foreground">
                        Cost spike · {providerDisplayName(alert.provider)}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        +{Math.round((alert.increase - 1) * 100)}% vs baseline
                      </p>
                    </>
                  )}
                  {alert.type === 'error_spike' && (
                    <>
                      <p className="font-medium text-foreground">
                        Error spike · {operationLabel(alert.provider, alert.endpoint)}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {formatPercent(alert.errorRate)} error rate
                      </p>
                    </>
                  )}
                  {alert.type === 'latency_spike' && (
                    <>
                      <p className="font-medium text-foreground font-mono text-xs">
                        Latency · {operationLabel(alert.provider, alert.endpoint)}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        P95 {(alert.p95Ms / 1000).toFixed(1)}s
                      </p>
                    </>
                  )}
                  {alert.type === 'traffic_anomaly' && (
                    <>
                      <p className="font-medium text-foreground">
                        Traffic anomaly · {operationLabel(alert.provider, alert.endpoint)}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        {formatNumber(alert.currentCalls)} calls ({(alert.currentCalls / alert.baselineCalls).toFixed(1)}× baseline)
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap">
                  <GuardrailTrackIncidentButton projectId={projectId} alert={alert} toastFn={toast} onCreated={onIncidentCreated} />
                  <GuardrailShareButtons projectId={projectId} alert={alert} toastFn={toast} />
                  <GuardrailGitHubIssueButton alert={alert} toastFn={toast} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="py-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No anomalies in this period. We’ll surface cost spikes, error spikes, slow endpoints, and traffic anomalies as they occur.
            </p>
            <p className="text-xs text-muted-foreground">
              Add Slack in Settings → Alerts to get notified when a guardrail fires.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
