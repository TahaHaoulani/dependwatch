'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatNumber, formatDuration, formatCurrency, formatPercent } from '@/lib/utils';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type ProviderRow = {
  provider: string;
  calls: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  costUsd: number;
};

type SortKey = 'provider' | 'calls' | 'errorRate' | 'p95Ms' | 'costUsd' | 'costShare';

export function DashboardProviderTable({ byProvider }: { byProvider: ProviderRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('calls');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const totalCost = useMemo(() => byProvider.reduce((s, p) => s + p.costUsd, 0), [byProvider]);
  const maxP95 = useMemo(
    () => Math.max(...byProvider.map((p) => p.p95Ms ?? 0), 1),
    [byProvider]
  );

  const sorted = useMemo(() => {
    const rows = byProvider.map((row) => ({
      ...row,
      costShare: totalCost > 0 ? row.costUsd / totalCost : 0,
    }));
    rows.sort((a, b) => {
      let va: number | string | null = a[sortKey];
      let vb: number | string | null = b[sortKey];
      if (sortKey === 'costShare') {
        va = a.costUsd / totalCost;
        vb = b.costUsd / totalCost;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va ?? '');
      const sb = String(vb ?? '');
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return rows;
  }, [byProvider, sortKey, sortDir, totalCost]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'provider' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">By provider</CardTitle>
        <CardDescription>Volume, reliability, latency, and cost per API</CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('provider')}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      Provider
                      <SortIcon column="provider" />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('calls')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Calls
                      <SortIcon column="calls" />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('errorRate')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Error rate
                      <SortIcon column="errorRate" />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('p95Ms')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Latency P95
                      <SortIcon column="p95Ms" />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('costUsd')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Cost
                      <SortIcon column="costUsd" />
                    </button>
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort('costShare')}
                      className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                    >
                      Cost %
                      <SortIcon column="costShare" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.provider} className="border-b border-border/50 last:border-0">
                    <td className="py-3 px-4 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-7 min-w-[28px] items-center justify-center rounded-md bg-muted/60">
                          <ProviderIcon name={row.provider} size={18} className="shrink-0" />
                        </span>
                        <span>{providerDisplayName(row.provider)}</span>
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums">{formatNumber(row.calls)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden" title={formatPercent(row.errorRate)}>
                          <div
                            className="h-full rounded-full bg-destructive/70"
                            style={{ width: `${Math.min(100, row.errorRate * 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums w-10 text-right">{formatPercent(row.errorRate)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="w-16 h-1 rounded-full bg-muted overflow-hidden" title={row.p95Ms != null ? formatDuration(row.p95Ms) : '—'}>
                          {row.p95Ms != null && (
                            <div
                              className="h-full rounded-full bg-primary/70"
                              style={{ width: `${Math.min(100, (row.p95Ms / maxP95) * 100)}%` }}
                            />
                          )}
                        </div>
                        <span className="tabular-nums text-xs">
                          {row.p95Ms != null ? formatDuration(row.p95Ms) : '—'}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 tabular-nums">{formatCurrency(row.costUsd)}</td>
                    <td className="text-right py-3 px-4 tabular-nums">
                      {totalCost > 0 ? formatPercent(row.costUsd / totalCost) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No provider data in this range. Try 24h or send more events.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
