'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';
import { ProviderIcon, providerDisplayName } from '@/components/dashboard/provider-icon';
import { useToast } from '@/components/ui/use-toast';

type Incident = {
  id: string;
  provider: string;
  endpoint: string | null;
  type: string;
  message: string;
  status: string;
  note: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

function operationLabel(provider: string, endpoint: string | null): string {
  return endpoint ? `${provider}.${endpoint}` : provider;
}

export function DashboardOpenIncidents({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['project-incidents', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/incidents`);
      if (!res.ok) throw new Error('Failed to load');
      const j = await res.json();
      const incidents = (j.incidents ?? []) as Incident[];
      return incidents.filter((i) => i.status !== 'resolved');
    },
    enabled: !!projectId,
  });

  const updateStatus = async (incidentId: string, status: 'acknowledged' | 'resolved') => {
    try {
      const res = await fetch(`/api/projects/${projectId}/incidents/${incidentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: status === 'resolved' ? 'Incident resolved' : 'Incident acknowledged' });
      queryClient.invalidateQueries({ queryKey: ['project-incidents', projectId] });
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const all = (data ?? []) as Incident[];
  if (isLoading || all.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-medium">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Open incidents
        </CardTitle>
        <CardDescription>Issues you’re tracking — acknowledge or resolve</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {all.map((inc) => (
            <li
              key={inc.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <ProviderIcon name={inc.provider} size={16} className="shrink-0" />
                  {operationLabel(inc.provider, inc.endpoint)}
                </div>
                <p className="text-muted-foreground mt-0.5">{inc.message}</p>
                {inc.note && <p className="text-xs text-muted-foreground mt-1">Note: {inc.note}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {inc.status === 'open' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => updateStatus(inc.id, 'acknowledged')}
                  >
                    Acknowledge
                  </Button>
                )}
                {inc.status !== 'resolved' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => updateStatus(inc.id, 'resolved')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
