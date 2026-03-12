import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { updateAlertRule, deleteAlertRule } from '@/lib/alert-rule';
import { getProjectById } from '@/lib/project';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  latencyThresholdMs: z.number().int().min(0).nullable().optional(),
  errorRateThresholdPercent: z.number().min(0).max(100).nullable().optional(),
  monthlyBudgetUsd: z.number().min(0).nullable().optional(),
  cooldownMinutes: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; ruleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId, ruleId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    await updateAlertRule(ruleId, session.user.id, parsed.data);
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'alert_rule.updated',
      resource: 'AlertRule',
      resourceId: ruleId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; ruleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId, ruleId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await deleteAlertRule(ruleId, session.user.id);
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'alert_rule.removed',
      resource: 'AlertRule',
      resourceId: ruleId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 404 });
  }
}
