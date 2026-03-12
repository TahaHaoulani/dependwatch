'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Check } from 'lucide-react';

export function ProjectGeneralClient({
  projectId,
  name: initialName,
  description: initialDescription,
  environment: initialEnvironment,
  canEdit = true,
}: {
  projectId: string;
  name: string;
  description: string;
  environment: string;
  canEdit?: boolean;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [environment, setEnvironment] = useState(initialEnvironment);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || name,
          description: description.trim() || null,
          environment: environment.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to save');
      }
      setSaved(true);
      toast({ title: 'Saved', description: 'Project updated.' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Project details</CardTitle>
        <CardDescription className="mt-1">
          Name, description, and environment tag. Used for filtering and display in the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {!canEdit && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Only owners, admins, and developers can edit project settings. You have view-only access.
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="proj-name" className="text-sm font-medium">Name</Label>
          <Input
            id="proj-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Project"
            maxLength={100}
            disabled={!canEdit}
            className="max-w-md"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proj-desc" className="text-sm font-medium">Description (optional)</Label>
          <textarea
            id="proj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Production API monitoring"
            maxLength={500}
            rows={2}
            disabled={!canEdit}
            className="flex w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground">{description.length}/500</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="proj-env" className="text-sm font-medium">Environment (optional)</Label>
          <Input
            id="proj-env"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="e.g. production, staging, development"
            maxLength={64}
            disabled={!canEdit}
            className="max-w-md"
          />
          <p className="text-xs text-muted-foreground">Helps filter events and reports by environment.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 transition-opacity duration-200">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
