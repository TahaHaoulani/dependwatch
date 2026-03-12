import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { listAlertRules, createAlertRule } from '@/lib/alert-rule';
import { getProjectById } from '@/lib/project';
import { writeAuditLog } from '@/lib/audit';
import { getCapabilitiesForProject, withinLimit } from '@/lib/pricing-capabilities';
import { z } from 'zod';

const postSchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().optional(),
  latencyThresholdMs: z.number().int().min(0).nullable().optional(),
  errorRateThresholdPercent: z.number().min(0).max(100).nullable().optional(),
  monthlyBudgetUsd: z.number().min(0).nullable().optional(),
  cooldownMinutes: z.number().int().min(0).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const rules = await listAlertRules(projectId, session.user.id);
  if (rules === null) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const serialized = rules.map((r) => ({
    ...r,
    errorRateThresholdPercent: r.errorRateThresholdPercent?.toNumber?.() ?? r.errorRateThresholdPercent,
    monthlyBudgetUsd: r.monthlyBudgetUsd?.toNumber?.() ?? r.monthlyBudgetUsd,
  }));
  return NextResponse.json({ rules: serialized });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const project = await getProjectById(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const capabilities = await getCapabilitiesForProject(projectId);
    const existingRules = await listAlertRules(projectId, session.user.id);
    const currentCount = existingRules?.length ?? 0;
    if (!withinLimit(currentCount, capabilities.maxAlertRules)) {
      return NextResponse.json(
        {
          error: `You have reached the limit of alert rules for the ${capabilities.planName} plan.`,
          code: 'PLAN_LIMIT_REACHED',
        },
        { status: 403 }
      );
    }
    const rule = await createAlertRule(projectId, session.user.id, parsed.data);
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'alert_rule.created',
      resource: 'AlertRule',
      resourceId: rule.id,
      metadata: { name: rule.name },
    });
    return NextResponse.json({
      id: rule.id,
      name: rule.name,
      enabled: rule.enabled,
      latencyThresholdMs: rule.latencyThresholdMs,
      errorRateThresholdPercent: rule.errorRateThresholdPercent?.toNumber?.() ?? rule.errorRateThresholdPercent,
      monthlyBudgetUsd: rule.monthlyBudgetUsd?.toNumber?.() ?? rule.monthlyBudgetUsd,
      cooldownMinutes: rule.cooldownMinutes,
      createdAt: rule.createdAt,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 500 });
  }
}
