'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Play, Loader2, ArrowUpRight } from 'lucide-react';

type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  latencyThresholdMs: number | null;
  errorRateThresholdPercent: number | null;
  monthlyBudgetUsd: number | null;
  cooldownMinutes: number;
};

type AlertCapabilities = {
  planId: string;
  planName: string;
  maxAlertRules: number;
  maxSlackWebhooks?: number;
};

export function ProjectAlertsClient({
  projectId,
  workspaceId,
  initialRules,
  canEdit = true,
  capabilities,
}: {
  projectId: string;
  workspaceId: string;
  initialRules: Rule[];
  canEdit?: boolean;
  capabilities: AlertCapabilities;
}) {
  const { toast } = useToast();
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [showSlackCtaOpen, setShowSlackCtaOpen] = useState(false);
  const [creatingFirstAlert, setCreatingFirstAlert] = useState(false);
  const [form, setForm] = useState({
    name: 'Latency alert',
    latencyThresholdMs: 1000,
    errorRateThresholdPercent: null as number | null,
    monthlyBudgetUsd: null as number | null,
    cooldownMinutes: 60,
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/alert-rules`);
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } finally {
      setLoading(false);
    }
  };


  const createRule = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/alert-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          latencyThresholdMs: form.latencyThresholdMs || null,
          errorRateThresholdPercent: form.errorRateThresholdPercent,
          monthlyBudgetUsd: form.monthlyBudgetUsd,
          cooldownMinutes: form.cooldownMinutes,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.code === 'PLAN_LIMIT_REACHED') {
          setModalOpen(false);
          setUpgradeModalOpen(true);
          return;
        }
        throw new Error(d.error ?? 'Failed');
      }
      setModalOpen(false);
      setForm({ name: 'Latency alert', latencyThresholdMs: 1000, errorRateThresholdPercent: null, monthlyBudgetUsd: null, cooldownMinutes: 60 });
      fetchRules();
      toast({ title: 'Alert rule created' });
      if ((capabilities.maxSlackWebhooks ?? 0) > 0) {
        setShowSlackCtaOpen(true);
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this alert rule?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/alert-rules/${ruleId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast({ title: 'Rule deleted' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const toggleEnabled = async (rule: Rule) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/alert-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      });
      if (!res.ok) throw new Error('Failed');
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
      toast({ title: rule.enabled ? 'Alert disabled' : 'Alert enabled' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const createFirstAlertRule = async () => {
    setCreatingFirstAlert(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/alert-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Error rate > 5%',
          latencyThresholdMs: null,
          errorRateThresholdPercent: 5,
          monthlyBudgetUsd: null,
          cooldownMinutes: 60,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.code === 'PLAN_LIMIT_REACHED') {
          setUpgradeModalOpen(true);
          return;
        }
        throw new Error(d.error ?? 'Failed');
      }
      fetchRules();
      toast({ title: 'Alert created', description: 'You’ll be notified when error rate exceeds 5%.' });
      if ((capabilities.maxSlackWebhooks ?? 0) > 0) {
        setShowSlackCtaOpen(true);
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setCreatingFirstAlert(false);
    }
  };

  const runEvaluation = async () => {
    setEvaluating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/alerts/evaluate`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Evaluation failed');
      const triggered = data.triggered ?? 0;
      const evaluated = data.evaluated ?? 0;
      if (triggered > 0) {
        const hasSlack = (capabilities.maxSlackWebhooks ?? 0) > 0;
        toast({
          title: `${triggered} rule(s) triggered`,
          description: hasSlack
            ? `Evaluated ${evaluated} rules. Alerts sent to your enabled Slack webhooks.`
            : `Evaluated ${evaluated} rules. Add Slack webhooks (Pro plan) below to receive alerts in Slack.`,
        });
      } else {
        toast({
          title: 'Evaluation complete',
          description: `Checked ${evaluated} rule(s). No thresholds exceeded.`,
        });
      }
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Evaluation failed', variant: 'destructive' });
    } finally {
      setEvaluating(false);
    }
  };

  const maxRules = capabilities.maxAlertRules;
  const atRuleLimit = maxRules !== -1 && rules.length >= maxRules;
  const usageLabel =
    maxRules === -1
      ? `${rules.length} used (Unlimited)`
      : `${rules.length} / ${maxRules} used (${capabilities.planName} plan)`;

  const showFirstAlertWizard = rules.length === 0 && canEdit && (capabilities.maxAlertRules === -1 || capabilities.maxAlertRules >= 1);

  return (
    <>
      {showFirstAlertWizard && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">Create your first alert</CardTitle>
            <CardDescription className="mt-1">
              Get notified when your API error rate exceeds 5%. We’ll create the rule; add a Slack webhook below to receive alerts in Slack.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button onClick={createFirstAlertRule} disabled={creatingFirstAlert}>
              {creatingFirstAlert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create error rate alert (5%)
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Alert rules</CardTitle>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">{usageLabel}</span>
          </div>
          <CardDescription className="mt-1">
            Rules are evaluated against your project metrics (last 24h for latency/errors, last 30d for budget). When a threshold is exceeded, alerts are sent to your <strong>enabled</strong> Slack webhooks. Run a check now or set up a cron/scheduler to evaluate periodically.
          </CardDescription>
          {capabilities.maxSlackWebhooks === 0 && canEdit && (
            <p className="mt-2 text-xs text-muted-foreground">
              On the Free plan, alerts are not sent to Slack. Upgrade to Pro to add webhooks and receive notifications.
            </p>
          )}
          {atRuleLimit && canEdit && (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
              <p className="font-medium">You have reached the limit of alert rules for the {capabilities.planName} plan.</p>
              <Link
                href={`/dashboard/${workspaceId}/billing`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200"
              >
                Upgrade plan <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          {rules.length > 0 && canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={runEvaluation} disabled={evaluating}>
                {evaluating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1.5" />}
                Run evaluation now
              </Button>
              <span className="text-xs text-muted-foreground">Checks all enabled rules; sends to your enabled Slack webhooks when a threshold is exceeded.</span>
            </div>
          )}
          {!canEdit && (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              You have view-only access.
            </p>
          )}
          {loading && rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
              No alert rules yet. Add one below. To receive alerts in Slack, add and enable webhooks (Pro/Scale) in the section below.
            </p>
          ) : (
            <ul className="space-y-2">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{r.name}</span>
                    <span className={r.enabled ? ' ml-2 text-xs text-muted-foreground' : ' ml-2 text-xs text-destructive'}>
                      {r.enabled ? 'On' : 'Off'}
                    </span>
                    {(r.latencyThresholdMs != null || r.errorRateThresholdPercent != null || r.monthlyBudgetUsd != null) && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.latencyThresholdMs != null && `Latency > ${r.latencyThresholdMs}ms `}
                        {r.errorRateThresholdPercent != null && `Error rate > ${r.errorRateThresholdPercent}% `}
                        {r.monthlyBudgetUsd != null && `Budget > $${r.monthlyBudgetUsd}`}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => toggleEnabled(r)}>
                        {r.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteRule(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <Button
              onClick={() => setModalOpen(true)}
              disabled={atRuleLimit}
              title={atRuleLimit ? 'Upgrade to create additional alert rules.' : undefined}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add rule
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New alert rule</DialogTitle>
            <DialogDescription>Configure threshold and cooldown.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Latency spike"
              />
            </div>
            <div className="grid gap-2">
              <Label>Latency threshold (ms)</Label>
              <Input
                type="number"
                value={form.latencyThresholdMs ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, latencyThresholdMs: e.target.value ? parseInt(e.target.value, 10) : 0 }))}
                placeholder="1000"
              />
            </div>
            <div className="grid gap-2">
              <Label>Error rate threshold (%)</Label>
              <Input
                type="number"
                value={form.errorRateThresholdPercent ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, errorRateThresholdPercent: e.target.value ? parseFloat(e.target.value) : null }))}
                placeholder="5"
              />
            </div>
            <div className="grid gap-2">
              <Label>Monthly budget ($)</Label>
              <Input
                type="number"
                value={form.monthlyBudgetUsd ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, monthlyBudgetUsd: e.target.value ? parseFloat(e.target.value) : null }))}
                placeholder="100"
              />
            </div>
            <div className="grid gap-2">
              <Label>Cooldown (minutes)</Label>
              <Input
                type="number"
                value={form.cooldownMinutes}
                onChange={(e) => setForm((f) => ({ ...f, cooldownMinutes: parseInt(e.target.value, 10) || 60 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={createRule}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSlackCtaOpen} onOpenChange={setShowSlackCtaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Slack to receive alerts</DialogTitle>
            <DialogDescription>
              Your rule is set. Add a Slack webhook below, then click <strong>Send test alert</strong> to verify. You’ll get notifications in Slack when thresholds are exceeded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlackCtaOpen(false)}>Dismiss</Button>
            <Button
              onClick={() => {
                setShowSlackCtaOpen(false);
                document.getElementById('slack-webhooks')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Take me to webhooks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade your plan</DialogTitle>
            <DialogDescription>
              You have reached the limit of alert rules for the {capabilities.planName} plan. Upgrade to Pro for more rules and Slack webhooks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <Link href={`/dashboard/${workspaceId}/billing`}>
                Upgrade plan <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
