'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDuration, formatCurrency } from '@/lib/utils';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import { Loader2 } from 'lucide-react';

export function DashboardEventDetailDialog({
  open,
  onOpenChange,
  eventDetail,
  eventDetailLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventDetail: Record<string, unknown> | null | undefined;
  eventDetailLoading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Event details</DialogTitle>
          <DialogDescription>API call event</DialogDescription>
        </DialogHeader>
        {eventDetailLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!eventDetailLoading && eventDetail && (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-medium inline-flex items-center gap-1.5">
                <ProviderIcon name={String(eventDetail.provider)} size={14} />
                {providerDisplayName(String(eventDetail.provider))}
              </dd>
            </div>
            {eventDetail.endpoint != null && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Endpoint</dt>
                <dd className="font-mono truncate max-w-[200px]">{String(eventDetail.endpoint)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Time</dt>
              <dd>{new Date(String(eventDetail.timestamp)).toLocaleString()}</dd>
            </div>
            {eventDetail.durationMs != null && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Latency</dt>
                <dd>{formatDuration(Number(eventDetail.durationMs))}</dd>
              </div>
            )}
            {eventDetail.statusCode != null && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd
                  className={
                    Number(eventDetail.statusCode) >= 400 ? 'text-destructive font-medium' : ''
                  }
                >
                  {String(eventDetail.statusCode)}
                </dd>
              </div>
            )}
            {eventDetail.errorMessage != null && (
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Error message</dt>
                <dd className="rounded bg-destructive/10 px-2 py-1.5 text-destructive text-xs break-words">
                  {String(eventDetail.errorMessage)}
                </dd>
              </div>
            )}
            {eventDetail.estimatedCostUsd != null &&
              Number(eventDetail.estimatedCostUsd) > 0 && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Est. cost</dt>
                  <dd>{formatCurrency(Number(eventDetail.estimatedCostUsd))}</dd>
                </div>
              )}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
