'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDuration, formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Loader2 } from 'lucide-react';

type OperationDetail = {
  operation?: string;
  stats?: { calls: number; errorRate: number; p95Ms: number | null; costUsd?: number };
  latencyDistribution?: { p50Ms: number | null; p95Ms: number | null; p99Ms: number | null };
  timeseries?: { time: string; calls: number; costUsd?: number }[];
  recentFailures?: { id: string; timestamp: string; errorMessage: string | null; statusCode: number | null }[];
};

export function OperationDetailDialog({
  open,
  onOpenChange,
  selectedOperation,
  operationDetail,
  operationDetailLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOperation: { provider: string; endpoint: string | null } | null;
  operationDetail: OperationDetail | null | undefined;
  operationDetailLoading: boolean;
}) {
  const title =
    operationDetail?.operation ??
    (selectedOperation
      ? `${selectedOperation.provider}${selectedOperation.endpoint ? `.${selectedOperation.endpoint}` : ''}`
      : '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{title}</DialogTitle>
          <DialogDescription>Operation-level metrics</DialogDescription>
        </DialogHeader>
        {operationDetailLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!operationDetailLoading && operationDetail && (
          <div className="space-y-6">
            {operationDetail.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Calls</p>
                  <p className="font-semibold tabular-nums">{formatNumber(operationDetail.stats.calls)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Error rate</p>
                  <p className="font-semibold tabular-nums">{formatPercent(operationDetail.stats.errorRate)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">P95 latency</p>
                  <p className="font-semibold tabular-nums">
                    {operationDetail.stats.p95Ms != null ? formatDuration(operationDetail.stats.p95Ms) : '—'}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Cost</p>
                  <p className="font-semibold tabular-nums">
                    {formatCurrency(operationDetail.stats.costUsd ?? 0)}
                  </p>
                </div>
              </div>
            )}
            {operationDetail.latencyDistribution && (
              <div>
                <p className="text-sm font-medium mb-2">Latency distribution</p>
                <div className="flex gap-4 text-sm">
                  <span>
                    P50:{' '}
                    {operationDetail.latencyDistribution.p50Ms != null
                      ? formatDuration(operationDetail.latencyDistribution.p50Ms)
                      : '—'}
                  </span>
                  <span>
                    P95:{' '}
                    {operationDetail.latencyDistribution.p95Ms != null
                      ? formatDuration(operationDetail.latencyDistribution.p95Ms)
                      : '—'}
                  </span>
                  <span>
                    P99:{' '}
                    {operationDetail.latencyDistribution.p99Ms != null
                      ? formatDuration(operationDetail.latencyDistribution.p99Ms)
                      : '—'}
                  </span>
                </div>
              </div>
            )}
            {operationDetail.timeseries && operationDetail.timeseries.length > 0 && (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Calls over time</p>
                  <div className="chart-container h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={operationDetail.timeseries}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) =>
                            new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          }
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          labelFormatter={(v) => new Date(v).toLocaleString()}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Cost trend</p>
                  <div className="chart-container h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={operationDetail.timeseries}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--chart-grid))" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) =>
                            new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          }
                        />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => '$' + Number(v).toFixed(2)} />
                        <Tooltip
                          formatter={(v: number) => [formatCurrency(v), 'Cost']}
                          labelFormatter={(v) => new Date(v).toLocaleString()}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="costUsd"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
            {operationDetail.recentFailures && operationDetail.recentFailures.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Recent failures</p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {operationDetail.recentFailures.map((f) => (
                    <li
                      key={f.id}
                      className="rounded border border-border/50 bg-muted/10 px-2 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{new Date(f.timestamp).toLocaleString()}</span>
                      {f.statusCode != null && (
                        <span className="ml-2 text-destructive font-medium">{f.statusCode}</span>
                      )}
                      {f.errorMessage && (
                        <span className="ml-2 truncate block">{f.errorMessage}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {operationDetail.stats == null && (
              <p className="text-sm text-muted-foreground">
                No data for this operation in the selected range.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
