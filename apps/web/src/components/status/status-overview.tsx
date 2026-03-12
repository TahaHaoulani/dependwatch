'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Server, Database } from 'lucide-react';

type HealthStatus = 'ok' | 'error' | 'skipped';

interface HealthResponse {
  status: string;
  db?: 'ok' | 'unhealthy' | 'skipped';
  message?: string;
}

export function StatusOverview() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/health')
      .then((res) => res.json())
      .then((json: HealthResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to fetch status');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-5 py-4 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
        <span>Checking platform status…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/5 px-5 py-4 text-sm">
        <div className="flex items-center gap-3 text-warning">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>Unable to reach health endpoint. You can try again or contact support if you are experiencing issues.</span>
        </div>
      </div>
    );
  }

  const appOk = data?.status === 'ok';
  const dbStatus: HealthStatus =
    data?.db === 'ok' ? 'ok' : data?.db === 'unhealthy' ? 'error' : 'skipped';

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="px-4 py-3 font-semibold text-foreground sm:px-5">Component</th>
              <th className="px-4 py-3 font-semibold text-foreground sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <tr className="transition-colors hover:bg-muted/10">
              <td className="flex items-center gap-2 px-4 py-3 sm:px-5">
                <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Application</span>
              </td>
              <td className="px-4 py-3 sm:px-5">
                {appOk ? (
                  <span className="inline-flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Operational
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 font-medium text-destructive">
                    <XCircle className="h-4 w-4" /> Degraded
                  </span>
                )}
              </td>
            </tr>
            <tr className="transition-colors hover:bg-muted/10">
              <td className="flex items-center gap-2 px-4 py-3 sm:px-5">
                <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>Database</span>
              </td>
              <td className="px-4 py-3 sm:px-5">
                {dbStatus === 'ok' && (
                  <span className="inline-flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> Operational
                  </span>
                )}
                {dbStatus === 'error' && (
                  <span className="inline-flex items-center gap-2 font-medium text-destructive">
                    <XCircle className="h-4 w-4" /> Unhealthy
                  </span>
                )}
                {dbStatus === 'skipped' && (
                  <span className="text-muted-foreground">Not configured</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        This is a live health check only. We don’t show historical uptime or incident history yet. If you’re seeing issues, <Link href="/contact" className="text-primary hover:underline">contact us</Link>.
      </p>
    </div>
  );
}
