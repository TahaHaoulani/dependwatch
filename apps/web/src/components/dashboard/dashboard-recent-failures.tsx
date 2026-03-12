'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import { Button } from '@/components/ui/button';

type RecentFailure = {
  id: string;
  timestamp: string;
  provider: string;
  endpoint: string | null;
  errorMessage: string | null;
  statusCode: number | null;
};

export function DashboardRecentFailures({
  recentFailures,
  fromTestEvents,
  onSelectEvent,
}: {
  recentFailures: RecentFailure[];
  fromTestEvents?: boolean;
  onSelectEvent: (eventId: string) => void;
}) {
  if (recentFailures.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">Recent failures</CardTitle>
        <CardDescription>
          {fromTestEvents
            ? 'Example failures from test events — your real production failures will appear here when you send events from the SDK.'
            : 'Latest failed API calls — click to inspect'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentFailures.slice(0, 10).map((e) => (
            <button
              type="button"
              key={e.id}
              onClick={() => onSelectEvent(e.id)}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2.5 text-sm text-left w-full hover:bg-muted/30 transition-colors"
            >
              <span className="text-muted-foreground shrink-0">
                {new Date(e.timestamp).toLocaleString()}
              </span>
              <ProviderIcon name={e.provider} size={14} className="shrink-0" />
              <span className="font-medium">{providerDisplayName(e.provider)}</span>
              {e.endpoint && (
                <span className="truncate max-w-[180px] text-muted-foreground">{e.endpoint}</span>
              )}
              {e.statusCode != null && (
                <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-xs font-medium text-destructive">
                  {e.statusCode}
                </span>
              )}
              {e.errorMessage && (
                <span className="truncate max-w-[280px] text-muted-foreground">{e.errorMessage}</span>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
