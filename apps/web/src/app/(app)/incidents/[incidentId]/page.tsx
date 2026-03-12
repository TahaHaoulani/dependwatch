import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { ArrowRight, AlertCircle, Activity, TrendingUp } from 'lucide-react';
import { providerDisplayName } from '@/components/dashboard/provider-icon';
import { formatDuration } from '@/lib/utils';
import { getIncidentByPublicId } from '@/lib/incident-report';

type DetectionType = 'latency_spike' | 'error_spike' | 'cost_anomaly' | 'traffic_anomaly';

const DETECTION_LABELS: Record<DetectionType, string> = {
  latency_spike: 'Latency spike',
  error_spike: 'Error spike',
  cost_anomaly: 'Cost anomaly',
  traffic_anomaly: 'Traffic anomaly',
};

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;
  const row = await getIncidentByPublicId(incidentId);
  if (!row) notFound();

  const incident = {
    id: row.publicId,
    provider: row.provider,
    endpoint: row.endpoint,
    detectionType: row.detectionType as DetectionType,
    message: row.message,
    metrics: row.metrics as Record<string, unknown> | null,
    timeline: (row.timeline as unknown[]) ?? [],
    createdAt: row.createdAt.toISOString(),
    projectName: row.project.name,
  };
  const metrics = incident.metrics ?? {};
  const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40">
        <div className="container mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-foreground flex items-center gap-2">
            <span className="text-primary">◇</span>
            DependWatch
          </Link>
          <Link href="/login?signup=1">
            <Button size="sm">Start monitoring your APIs</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-2xl px-4 py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Incident report</span>
          <span>·</span>
          <time dateTime={incident.createdAt}>
            {new Date(incident.createdAt).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </time>
        </div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-warning" />
          {incident.message}
        </h1>

        <div className="mt-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Provider</p>
                  <p className="font-medium">{providerDisplayName(incident.provider)}</p>
                </div>
                {incident.endpoint && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Endpoint</p>
                    <p className="font-mono text-sm">{incident.endpoint}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detection type</p>
                  <p className="font-medium">{DETECTION_LABELS[incident.detectionType] ?? incident.detectionType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.keys(metrics).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-2 sm:grid-cols-2">
                  {'errorRatePercent' in metrics && (
                    <>
                      <dt className="text-muted-foreground text-sm">Error rate</dt>
                      <dd className="font-mono text-sm">{String(metrics.errorRatePercent)}%</dd>
                    </>
                  )}
                  {'p95Seconds' in metrics && (
                    <>
                      <dt className="text-muted-foreground text-sm">P95 latency</dt>
                      <dd className="font-mono text-sm">{String(metrics.p95Seconds)}s</dd>
                    </>
                  )}
                  {'p95Ms' in metrics && (
                    <>
                      <dt className="text-muted-foreground text-sm">P95 latency</dt>
                      <dd className="font-mono text-sm">{formatDuration(Number(metrics.p95Ms))}</dd>
                    </>
                  )}
                  {'percentIncrease' in metrics && (
                    <>
                      <dt className="text-muted-foreground text-sm">Increase vs baseline</dt>
                      <dd className="font-mono text-sm">+{String(metrics.percentIncrease)}%</dd>
                    </>
                  )}
                  {'multiplier' in metrics && (
                    <>
                      <dt className="text-muted-foreground text-sm">Traffic multiplier</dt>
                      <dd className="font-mono text-sm">{String(metrics.multiplier)}×</dd>
                    </>
                  )}
                  {'currentCalls' in metrics && 'baselineCalls' in metrics && (
                    <>
                      <dt className="text-muted-foreground text-sm">Calls (current vs baseline)</dt>
                      <dd className="font-mono text-sm">{String(metrics.currentCalls)} / {String(metrics.baselineCalls)}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          )}

          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {timeline.map((item: unknown, i: number) => (
                    <li key={i} className="flex gap-2 text-muted-foreground">
                      {typeof item === 'object' && item !== null && 'timestamp' in (item as Record<string, unknown>) && (
                        <span className="font-mono text-xs">{(item as Record<string, unknown>).timestamp as string}</span>
                      )}
                      {typeof item === 'object' && item !== null && 'label' in (item as Record<string, unknown>) && (
                        <span>{(item as Record<string, unknown>).label as string}</span>
                      )}
                      {typeof item === 'string' && <span>{item}</span>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Automatically detected by DependWatch.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/login?signup=1">
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
