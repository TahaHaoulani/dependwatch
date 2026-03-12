'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDuration } from '@/lib/utils';
import { providerDisplayName } from '@/components/dashboard/provider-icon';
import {
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';

export type TimeseriesBucket = {
  time: string;
  calls: number;
  avgLatencyMs: number | null;
  costUsd?: number;
};

export type ChartAnomaly = {
  time: string;
  type: 'error_spike' | 'latency_spike';
  label?: string;
};

export type TimeseriesBucketByProvider = {
  time: string;
  provider: string;
  calls: number;
  avgLatencyMs: number | null;
  costUsd?: number;
};

const CHART_COLOR_VOLUME = 'hsl(var(--chart-1))'; // blue
const CHART_COLOR_LATENCY = 'hsl(var(--chart-4))'; // purple
const CHART_GRID = 'hsl(var(--chart-grid))';
const CHART_LABEL = 'hsl(var(--chart-label))';

const PROVIDER_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-3))',
] as const;
function getProviderColor(index: number): string {
  return PROVIDER_COLORS[index % PROVIDER_COLORS.length];
}

/** Trim timeseries to the range that contains data to avoid wide empty spans (small datasets). */
function trimToDataRange<T extends { time: string; calls?: number; avgLatencyMs?: number | null }>(
  data: T[],
  minBuckets = 3
): T[] {
  if (data.length <= minBuckets) return data;
  let first = 0;
  let last = data.length - 1;
  for (let i = 0; i < data.length; i++) {
    const hasData = (data[i].calls ?? 0) > 0 || data[i].avgLatencyMs != null;
    if (hasData) {
      first = i;
      break;
    }
  }
  for (let i = data.length - 1; i >= 0; i--) {
    const hasData = (data[i].calls ?? 0) > 0 || data[i].avgLatencyMs != null;
    if (hasData) {
      last = i;
      break;
    }
  }
  const span = last - first + 1;
  const padded = Math.max(minBuckets, Math.min(span + 2, data.length));
  const start = Math.max(0, first - 1);
  const end = Math.min(data.length, start + padded);
  return data.slice(start, end);
}

/** Format Y-axis for latency: ms or s. */
function formatLatencyTick(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

/** Format X-axis: compact date or time depending on bucket count. */
function formatXTick(timeStr: string, bucketCount: number): string {
  const d = new Date(timeStr);
  if (bucketCount <= 48) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Rich tooltip: dark theme, rounded, shadow. */
function ChartTooltipVolume({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || label == null) return null;
  const value = payload[0]?.value ?? 0;
  const dateLabel = new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div
      className="rounded-lg border border-chart-tooltip-border bg-chart-tooltip-bg px-3 py-2 shadow-popover text-popover-foreground text-xs"
      style={{ boxShadow: 'var(--shadow-popover)' }}
    >
      <div className="font-medium text-muted-foreground">{dateLabel}</div>
      <div className="mt-0.5 font-semibold tabular-nums">
        {value} API call{value !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

function ChartTooltipLatency({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || label == null) return null;
  const ms = payload[0]?.value ?? 0;
  const dateLabel = new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div
      className="rounded-lg border border-chart-tooltip-border bg-chart-tooltip-bg px-3 py-2 shadow-popover text-popover-foreground text-xs"
      style={{ boxShadow: 'var(--shadow-popover)' }}
    >
      <div className="font-medium text-muted-foreground">{dateLabel}</div>
      <div className="mt-0.5 font-semibold tabular-nums">
        {formatDuration(ms)} avg latency
      </div>
    </div>
  );
}

/** Multi-series tooltip: one row per provider. */
function ChartTooltipOverlay({
  active,
  payload,
  label,
  valueLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  valueLabel: string;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length || label == null) return null;
  const dateLabel = new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const entries = payload.filter((p) => p.value != null && Number.isFinite(p.value));
  return (
    <div
      className="rounded-lg border border-chart-tooltip-border bg-chart-tooltip-bg px-3 py-2 shadow-popover text-popover-foreground text-xs min-w-[120px]"
      style={{ boxShadow: 'var(--shadow-popover)' }}
    >
      <div className="font-medium text-muted-foreground">{dateLabel}</div>
      <div className="mt-1.5 space-y-1">
        {entries.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="rounded-full w-2 h-2 shrink-0" style={{ backgroundColor: p.color }} />
              {providerDisplayName(p.name)}
            </span>
            <span className="font-semibold tabular-nums">{formatValue(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardCharts({
  timeseries,
  timeseriesByProvider = [],
  providers = [],
  anomalies = [],
}: {
  timeseries: TimeseriesBucket[];
  timeseriesByProvider?: TimeseriesBucketByProvider[];
  providers?: { provider: string }[];
  anomalies?: ChartAnomaly[];
}) {
  const totalCalls = timeseries.reduce((s, t) => s + t.calls, 0);
  const hasCalls = totalCalls > 0;
  const hasLatency = timeseries.some((t) => t.avgLatencyMs != null);

  const providerList = useMemo(() => providers.map((p) => p.provider), [providers]);
  const hasOverlay = providerList.length > 1 && timeseriesByProvider.length > 0;

  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(() => new Set(providerList));
  useEffect(() => {
    if (providerList.length > 0) {
      setSelectedProviders((prev) => {
        const next = new Set(providerList);
        if (prev.size === 0) return next;
        const merged = new Set(prev);
        for (const p of providerList) if (!merged.has(p)) merged.add(p);
        return merged;
      });
    }
  }, [providerList.join(',')]);
  const toggleProvider = useCallback((provider: string) => {
    setSelectedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(provider)) next.delete(provider);
      else next.add(provider);
      return next;
    });
  }, []);

  const trimmedData = useMemo(
    () => (hasCalls || hasLatency ? trimToDataRange(timeseries) : timeseries),
    [timeseries, hasCalls, hasLatency]
  );
  const showDots = trimmedData.length <= 24;

  const byProviderByTime = useMemo(() => {
    const map = new Map<string, Map<string, { calls: number; avgLatencyMs: number | null }>>();
    for (const row of timeseriesByProvider) {
      let perTime = map.get(row.time);
      if (!perTime) {
        perTime = new Map();
        map.set(row.time, perTime);
      }
      perTime.set(row.provider, { calls: row.calls, avgLatencyMs: row.avgLatencyMs });
    }
    return map;
  }, [timeseriesByProvider]);

  const pivotedVolumeData = useMemo(() => {
    if (!hasOverlay || selectedProviders.size === 0) return null;
    const selected = Array.from(selectedProviders);
    return trimmedData.map((row) => {
      const out: Record<string, number> = { time: row.time };
      const perTime = byProviderByTime.get(row.time);
      for (const p of selected) {
        out[p] = perTime?.get(p)?.calls ?? 0;
      }
      return out as Record<string, string | number>;
    });
  }, [hasOverlay, selectedProviders, trimmedData, byProviderByTime]);

  const pivotedLatencyData = useMemo(() => {
    if (!hasOverlay || selectedProviders.size === 0) return null;
    const selected = Array.from(selectedProviders);
    return trimmedData.map((row) => {
      const out: Record<string, string | number | null> = { time: row.time };
      const perTime = byProviderByTime.get(row.time);
      for (const p of selected) {
        const ms = perTime?.get(p)?.avgLatencyMs ?? null;
        out[p] = ms;
      }
      return out as Record<string, string | number | null>;
    });
  }, [hasOverlay, selectedProviders, trimmedData, byProviderByTime]);

  const anomalyTimes = useMemo(() => new Set(anomalies.map((a) => a.time)), [anomalies]);

  const effectiveSelected = selectedProviders.size > 0 ? selectedProviders : new Set(providerList);
  const selectedList = Array.from(effectiveSelected);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-medium">Call volume</CardTitle>
          <CardDescription>API calls over time</CardDescription>
          {hasOverlay && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2">
              <span className="text-xs font-medium text-muted-foreground">By provider:</span>
              {providerList.map((provider) => (
                <label
                  key={provider}
                  className="flex items-center gap-2 cursor-pointer text-sm text-foreground hover:text-foreground/90"
                >
                  <Checkbox
                    checked={effectiveSelected.has(provider)}
                    onCheckedChange={() => toggleProvider(provider)}
                  />
                  <span>{providerDisplayName(provider)}</span>
                </label>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="chart-container h-[260px]">
            {hasCalls ? (
              selectedList.length > 0 && pivotedVolumeData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={pivotedVolumeData}
                    margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: CHART_LABEL }}
                      tickFormatter={(v) => formatXTick(v, pivotedVolumeData.length)}
                      axisLine={{ stroke: CHART_GRID }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: CHART_LABEL }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      width={28}
                    />
                    <Tooltip
                      content={
                        <ChartTooltipOverlay
                          valueLabel="calls"
                          formatValue={(v) => `${v} call${v !== 1 ? 's' : ''}`}
                        />
                      }
                      cursor={{ fill: 'hsl(var(--muted) / 0.2)', stroke: CHART_LABEL, strokeWidth: 1 }}
                    />
                    {selectedList.map((provider, i) => (
                      <Line
                        key={provider}
                        type="monotone"
                        dataKey={provider}
                        name={provider}
                        stroke={getProviderColor(i)}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        animationDuration={500}
                        animationEasing="ease-out"
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trimmedData}
                  margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLOR_VOLUME} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={CHART_COLOR_VOLUME} stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: CHART_LABEL }}
                    tickFormatter={(v) => formatXTick(v, trimmedData.length)}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: CHART_LABEL }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={28}
                  />
                  <Tooltip
                    content={<ChartTooltipVolume />}
                    cursor={{ fill: 'hsl(var(--muted) / 0.3)', stroke: CHART_LABEL, strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  {anomalyTimes.size > 0 && trimmedData.some((b) => anomalyTimes.has(b.time)) && anomalies
                    .filter((a) => a.type === 'error_spike')
                    .map((a) => (
                      <ReferenceLine
                        key={a.time}
                        x={a.time}
                        stroke="hsl(var(--warning))"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    ))}
                  <Bar
                    dataKey="calls"
                    fill="url(#volumeGradient)"
                    radius={[4, 4, 0, 0]}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground text-center px-4">
                <span>No data in this range.</span>
                <span className="text-xs">Send test events or select 24h to see activity.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-medium">Avg latency</CardTitle>
          <CardDescription>Response time over time</CardDescription>
          {hasOverlay && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2">
              <span className="text-xs font-medium text-muted-foreground">By provider:</span>
              {providerList.map((provider) => (
                <label
                  key={provider}
                  className="flex items-center gap-2 cursor-pointer text-sm text-foreground hover:text-foreground/90"
                >
                  <Checkbox
                    checked={effectiveSelected.has(provider)}
                    onCheckedChange={() => toggleProvider(provider)}
                  />
                  <span>{providerDisplayName(provider)}</span>
                </label>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="chart-container h-[260px]">
            {hasLatency ? (
              selectedList.length > 0 && pivotedLatencyData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={pivotedLatencyData}
                    margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 11, fill: CHART_LABEL }}
                      tickFormatter={(v) => formatXTick(v, pivotedLatencyData.length)}
                      axisLine={{ stroke: CHART_GRID }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: CHART_LABEL }}
                      tickFormatter={formatLatencyTick}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <Tooltip
                      content={
                        <ChartTooltipOverlay
                          valueLabel="latency"
                          formatValue={(v) => formatDuration(v)}
                        />
                      }
                      cursor={{ fill: 'hsl(var(--muted) / 0.2)', stroke: CHART_LABEL, strokeWidth: 1 }}
                    />
                    {anomalyTimes.size > 0 && anomalies
                      .filter((a) => a.type === 'latency_spike')
                      .map((a) => (
                        <ReferenceLine
                          key={a.time}
                          x={a.time}
                          stroke="hsl(var(--warning))"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                      ))}
                    {selectedList.map((provider, i) => (
                      <Line
                        key={provider}
                        type="monotone"
                        dataKey={provider}
                        name={provider}
                        stroke={getProviderColor(i)}
                        strokeWidth={2}
                        connectNulls
                        dot={showDots ? { r: 2.5, fill: getProviderColor(i), strokeWidth: 0 } : false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        animationDuration={500}
                        animationEasing="ease-out"
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trimmedData}
                  margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLOR_LATENCY} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={CHART_COLOR_LATENCY} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: CHART_LABEL }}
                    tickFormatter={(v) => formatXTick(v, trimmedData.length)}
                    axisLine={{ stroke: CHART_GRID }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: CHART_LABEL }}
                    tickFormatter={formatLatencyTick}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <Tooltip
                    content={<ChartTooltipLatency />}
                    cursor={{ fill: 'hsl(var(--muted) / 0.2)', stroke: CHART_LABEL, strokeWidth: 1 }}
                  />
                  {anomalyTimes.size > 0 && anomalies
                    .filter((a) => a.type === 'latency_spike')
                    .map((a) => (
                      <ReferenceLine
                        key={a.time}
                        x={a.time}
                        stroke="hsl(var(--warning))"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    ))}
                  <Area
                    type="monotone"
                    dataKey="avgLatencyMs"
                    fill="url(#latencyGradient)"
                    stroke="none"
                    connectNulls
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="avgLatencyMs"
                    stroke={CHART_COLOR_LATENCY}
                    strokeWidth={2}
                    connectNulls
                    dot={showDots ? { r: 3, fill: CHART_COLOR_LATENCY, strokeWidth: 0 } : false}
                    activeDot={{ r: 5, fill: CHART_COLOR_LATENCY, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                    animationDuration={500}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
              )
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-sm text-muted-foreground text-center px-4">
                <span>No latency data in this range.</span>
                <span className="text-xs">Send test events or select 24h.</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
