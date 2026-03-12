'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock } from 'lucide-react';

type ScheduleConfig = {
  digestEnabled: boolean;
  digestFrequency: string | null;
  digestTimeOfDay: string | null;
  digestTimezone: string | null;
  digestDayOfWeek: number | null;
  alertEvaluationFrequencyMinutes: number | null;
};

export function ProjectScheduleClient({
  projectId,
  canEdit,
  digestDeliveryAvailable,
}: {
  projectId: string;
  canEdit: boolean;
  digestDeliveryAvailable: boolean;
}) {
  const { toast } = useToast();
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertFreq, setAlertFreq] = useState<string>('');
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState('09:00');
  const [digestFreq, setDigestFreq] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    fetch(`/api/projects/${projectId}/schedule`)
      .then((r) => r.json())
      .then((d) => {
        setConfig(d);
        setAlertFreq(d.alertEvaluationFrequencyMinutes != null ? String(d.alertEvaluationFrequencyMinutes) : '');
        setDigestEnabled(d.digestEnabled ?? false);
        setDigestTime(d.digestTimeOfDay ?? '09:00');
        setDigestFreq((d.digestFrequency ?? 'daily') as 'daily' | 'weekly');
      })
      .catch(() => toast({ title: 'Failed to load schedule', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertEvaluationFrequencyMinutes: alertFreq === '' ? null : parseInt(alertFreq, 10),
          digestEnabled: digestDeliveryAvailable ? digestEnabled : false,
          digestFrequency: digestDeliveryAvailable && digestEnabled ? digestFreq : null,
          digestTimeOfDay: digestDeliveryAvailable && digestEnabled ? digestTime : null,
          digestTimezone: 'UTC',
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast({ title: 'Schedule saved' });
    } catch {
      toast({ title: 'Failed to save schedule', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Automated schedule
          </CardTitle>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          </CardContent>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Automated schedule
        </CardTitle>
        <CardDescription>
          Alerts and digests run automatically. No external cron needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-2">
          <Label>Alert evaluation</Label>
          <Select
            value={alertFreq}
            onValueChange={setAlertFreq}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Not scheduled" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not scheduled</SelectItem>
              <SelectItem value="1">Every 1 min</SelectItem>
              <SelectItem value="5">Every 5 min</SelectItem>
              <SelectItem value="15">Every 15 min</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            How often to evaluate alert rules and send to Slack when thresholds are exceeded.
          </p>
        </div>
        {digestDeliveryAvailable && (
          <div className="grid gap-2">
            <Label>Digest delivery</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={digestEnabled ? 'on' : 'off'}
                onValueChange={(v) => setDigestEnabled(v === 'on')}
                disabled={!canEdit}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="on">On</SelectItem>
                </SelectContent>
              </Select>
              {digestEnabled && (
                <>
                  <Select
                    value={digestFreq}
                    onValueChange={(v) => setDigestFreq(v as 'daily' | 'weekly')}
                    disabled={!canEdit}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    type="time"
                    value={digestTime}
                    onChange={(e) => setDigestTime(e.target.value)}
                    disabled={!canEdit}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Digest is sent to your enabled Slack webhooks at the chosen time (UTC).
            </p>
          </div>
        )}
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save schedule
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
