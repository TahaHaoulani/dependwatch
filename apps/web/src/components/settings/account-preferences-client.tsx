'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useTheme } from '@/components/providers/theme-provider';

type Prefs = {
  theme: string;
  timezone: string;
  dateFormat: string | null;
  defaultLandingPage: string | null;
  emailNotifications: boolean;
  billingNotifications: boolean;
  alertDigest: string;
};

export function AccountPreferencesClient({ initialPrefs }: { initialPrefs: Prefs }) {
  const { toast } = useToast();
  const { theme: contextTheme, setTheme: setContextTheme } = useTheme();
  const [prefs, setPrefs] = useState(initialPrefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(initialPrefs);
  }, [initialPrefs]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/account/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: prefs.theme,
          timezone: prefs.timezone,
          dateFormat: prefs.dateFormat || null,
          defaultLandingPage: prefs.defaultLandingPage || null,
          emailNotifications: prefs.emailNotifications,
          billingNotifications: prefs.billingNotifications,
          alertDigest: prefs.alertDigest,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated = await res.json();
      setPrefs(updated);
      if (prefs.theme !== contextTheme) setContextTheme(prefs.theme as 'dark' | 'light' | 'system');
      toast({ title: 'Preferences saved' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">App preferences</CardTitle>
        <CardDescription className="mt-1">
          Theme and notification defaults. Theme can also be changed from the header toggle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <div className="grid gap-2">
          <Label className="text-sm font-medium">Theme</Label>
          <Select
            value={prefs.theme}
            onValueChange={(v) => setPrefs((p) => ({ ...p, theme: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pref-timezone" className="text-sm font-medium">Timezone</Label>
          <input
            id="pref-timezone"
            value={prefs.timezone}
            onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
            placeholder="UTC"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-sm font-medium">Alert digest</Label>
          <Select
            value={prefs.alertDigest}
            onValueChange={(v) => setPrefs((p) => ({ ...p, alertDigest: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Alert digest" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="daily">Daily digest</SelectItem>
              <SelectItem value="weekly">Weekly digest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="pref-email"
            checked={prefs.emailNotifications}
            onCheckedChange={(checked) =>
              setPrefs((p) => ({ ...p, emailNotifications: checked === true }))
            }
          />
          <Label htmlFor="pref-email" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Email notifications
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox
            id="pref-billing"
            checked={prefs.billingNotifications}
            onCheckedChange={(checked) =>
              setPrefs((p) => ({ ...p, billingNotifications: checked === true }))
            }
          />
          <Label htmlFor="pref-billing" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Billing notifications
          </Label>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
