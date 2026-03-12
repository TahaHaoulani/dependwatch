'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { captureEvent, AnalyticsEvents } from '@/lib/posthog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { useToast } from '@/components/ui/use-toast';
import { Check, KeyRound, FolderOpen, LayoutDashboard } from 'lucide-react';

type Step = 'workspace' | 'project' | 'key';

const steps: { id: Step; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'workspace', label: 'Workspace', icon: FolderOpen },
  { id: 'project', label: 'Project', icon: LayoutDashboard },
  { id: 'key', label: 'API key', icon: KeyRound },
];

export function OnboardingClient({
  userId,
  initialWorkspaceName,
  existingWorkspaceId,
}: {
  userId: string;
  initialWorkspaceName?: string;
  existingWorkspaceId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(existingWorkspaceId ? 'project' : 'workspace');
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName ?? 'My Workspace');
  const [projectName, setProjectName] = useState('My Project');
  const [loading, setLoading] = useState(false);
  const [ingestKey, setIngestKey] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(existingWorkspaceId ?? null);

  const stepIndex = steps.findIndex((s) => s.id === step);

  const createWorkspace = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create workspace');
      }
      const data = await res.json();
      setWorkspaceId(data.id);
      setStep('project');
      captureEvent(AnalyticsEvents.workspace_created);
    } catch (e) {
      toast({
        title: 'Couldn’t create workspace',
        description: e instanceof Error ? e.message : 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces/' + workspaceId + '/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create project');
      }
      const data = await res.json();
      setIngestKey(data.ingestKey);
      setStep('key');
      captureEvent(AnalyticsEvents.project_created);
    } catch (e) {
      toast({
        title: 'Couldn’t create project',
        description: e instanceof Error ? e.message : 'Check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    if (!workspaceId) return;
    captureEvent(AnalyticsEvents.onboarding_completed);
    router.push('/api/onboarding/redirect?workspaceId=' + encodeURIComponent(workspaceId));
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center last:flex-none">
            <div
              className={`flex flex-col items-center gap-1 ${
                i < stepIndex ? 'text-primary' : i === stepIndex ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                  i <= stepIndex ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                {i < stepIndex ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className="text-xs font-medium">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${i < stepIndex ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {step === 'workspace' && (
        <Card>
          <CardHeader>
            <CardTitle>Name your workspace</CardTitle>
            <CardDescription>
              You can rename it anytime. One step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace">Workspace name</Label>
              <Input
                id="workspace"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Acme Inc"
                disabled={loading}
              />
            </div>
            <Button className="w-full" loading={loading} onClick={createWorkspace}>
              {loading ? 'Creating…' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'project' && (
        <Card>
          <CardHeader>
            <CardTitle>Name your first project</CardTitle>
            <CardDescription>
              One project = one ingest key. Add more later for staging, production, etc.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project">Project name</Label>
              <Input
                id="project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Production API"
                disabled={loading}
              />
            </div>
            <Button className="w-full" loading={loading} onClick={createProject}>
              {loading ? 'Creating…' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'key' && (
        <Card>
          <CardHeader>
            <CardTitle>Your ingest key</CardTitle>
            <CardDescription>
              Copy this key now — we won’t show it again. Then add it to your app or run the sample script to see data in the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <code className="flex-1 truncate font-mono text-sm break-all select-all">{ingestKey}</code>
              <CopyButton text={ingestKey ?? ''} onCopy={() => captureEvent(AnalyticsEvents.ingest_key_copied)} />
            </div>
            <CopyButton
              text={ingestKey ?? ''}
              label
              toastMessage="Ingest key copied"
              className="w-full"
              onCopy={() => captureEvent(AnalyticsEvents.ingest_key_copied)}
            />
            <Button className="w-full" onClick={goToDashboard}>
              Go to dashboard
            </Button>
            <p className="text-xs text-muted-foreground">
              In your app: set <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">DEPENDWATCH_INGEST_KEY</code> or pass it to the SDK. <a href="/docs#quickstart" className="underline hover:text-foreground">Quickstart</a>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
