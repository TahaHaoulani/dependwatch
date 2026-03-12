import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { getWorkspaceMemberRole } from '@/lib/workspace';
import { getCapabilitiesForProject } from '@/lib/pricing-capabilities';
import { ProjectAlertsClient } from '@/components/settings/project-alerts-client';
import { ProjectSlackWebhooksClient } from '@/components/settings/project-slack-webhooks-client';
import { ProjectDigestPreviewClient } from '@/components/settings/project-digest-preview-client';
import { ProjectScheduleClient } from '@/components/settings/project-schedule-client';

export default async function ProjectAlertsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { workspaceId, projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) return null;

  const [rules, webhooks, role, capabilities] = await Promise.all([
    import('@/lib/alert-rule').then((m) => m.listAlertRules(projectId, session.user.id)),
    import('@/lib/slack-webhook').then((m) => m.listSlackWebhooks(projectId, session.user.id)),
    getWorkspaceMemberRole(workspaceId, session.user.id),
    getCapabilitiesForProject(projectId),
  ]);
  const canEdit = role !== 'viewer' && role != null;
  const serialized = (rules ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    latencyThresholdMs: r.latencyThresholdMs,
    errorRateThresholdPercent: r.errorRateThresholdPercent?.toNumber?.() ?? r.errorRateThresholdPercent,
    monthlyBudgetUsd: r.monthlyBudgetUsd?.toNumber?.() ?? r.monthlyBudgetUsd,
    cooldownMinutes: r.cooldownMinutes,
  }));
  const webhookList = (webhooks ?? []).map((w) => ({ id: w.id, url: w.url, enabled: w.enabled }));

  return (
    <>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Configure alert rules and Slack webhooks. When a rule’s threshold is exceeded, notifications are sent only to your enabled Slack webhooks (Pro/Scale). Free plan: one rule, no webhooks.
        </p>
      </div>
      <div className="space-y-8">
        <ProjectAlertsClient
          projectId={projectId}
          workspaceId={workspaceId}
          initialRules={serialized}
          canEdit={canEdit}
          capabilities={capabilities}
        />
        <div id="slack-webhooks">
          <ProjectSlackWebhooksClient
            projectId={projectId}
            workspaceId={workspaceId}
            initialWebhooks={webhookList}
            canEdit={canEdit}
            capabilities={capabilities}
          />
        </div>
        <ProjectDigestPreviewClient projectId={projectId} workspaceId={workspaceId} capabilities={capabilities} />
        <ProjectScheduleClient
          projectId={projectId}
          canEdit={canEdit}
          digestDeliveryAvailable={capabilities.digestDelivery}
        />
      </div>
    </>
  );
}
