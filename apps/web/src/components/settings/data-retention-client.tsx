'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function DataRetentionClient({
  projectId,
  planRetentionDays,
  retentionDaysOverride,
  canEdit = true,
}: {
  projectId: string;
  planRetentionDays: number;
  retentionDaysOverride: number | null;
  canEdit?: boolean;
}) {
  const { toast } = useToast();
  const [override, setOverride] = useState(retentionDaysOverride?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const value = override.trim() ? parseInt(override, 10) : null;
      if (value != null && (value < 1 || value > 365)) {
        toast({ title: 'Invalid', description: 'Retention must be between 1 and 365 days.', variant: 'destructive' });
        return;
      }
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDaysOverride: value }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Retention window</CardTitle>
        <CardDescription className="mt-1">
          Event data older than the retention window is removed. Your plan default is {planRetentionDays} days. Leave blank to use the plan default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {!canEdit && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            You have view-only access.
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="retention">Override retention (days)</Label>
          <Input
            id="retention"
            type="number"
            min={1}
            max={365}
            value={override}
            onChange={(e) => setOverride(e.target.value)}
            placeholder={String(planRetentionDays)}
            disabled={!canEdit}
          />
        </div>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
