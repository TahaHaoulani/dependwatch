import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getProjectById } from '@/lib/project';
import { ensureCanEditProject } from '@/lib/workspace';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const patchSchema = z.object({
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(['daily', 'weekly']).optional().nullable(),
  digestTimeOfDay: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  digestTimezone: z.string().min(1).max(64).optional().nullable(),
  digestDayOfWeek: z.number().min(0).max(6).optional().nullable(),
  alertEvaluationFrequencyMinutes: z.union([z.literal(1), z.literal(5), z.literal(15)]).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const config = await prisma.projectScheduleConfig.findUnique({
    where: { projectId },
  });
  return NextResponse.json({
    digestEnabled: config?.digestEnabled ?? false,
    digestFrequency: config?.digestFrequency ?? null,
    digestTimeOfDay: config?.digestTimeOfDay ?? null,
    digestTimezone: config?.digestTimezone ?? 'UTC',
    digestDayOfWeek: config?.digestDayOfWeek ?? null,
    lastDigestAt: config?.lastDigestAt?.toISOString() ?? null,
    alertEvaluationFrequencyMinutes: config?.alertEvaluationFrequencyMinutes ?? null,
    lastAlertEvaluationAt: config?.lastAlertEvaluationAt?.toISOString() ?? null,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    await ensureCanEditProject(project.workspaceId, session.user.id);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.digestEnabled !== undefined) data.digestEnabled = parsed.data.digestEnabled;
  if (parsed.data.digestFrequency !== undefined) data.digestFrequency = parsed.data.digestFrequency;
  if (parsed.data.digestTimeOfDay !== undefined) data.digestTimeOfDay = parsed.data.digestTimeOfDay;
  if (parsed.data.digestTimezone !== undefined) data.digestTimezone = parsed.data.digestTimezone;
  if (parsed.data.digestDayOfWeek !== undefined) data.digestDayOfWeek = parsed.data.digestDayOfWeek;
  if (parsed.data.alertEvaluationFrequencyMinutes !== undefined) data.alertEvaluationFrequencyMinutes = parsed.data.alertEvaluationFrequencyMinutes;

  const config = await prisma.projectScheduleConfig.upsert({
    where: { projectId },
    create: {
      projectId,
      digestEnabled: (data.digestEnabled as boolean) ?? false,
      digestFrequency: (data.digestFrequency as string | null) ?? null,
      digestTimeOfDay: (data.digestTimeOfDay as string | null) ?? null,
      digestTimezone: (data.digestTimezone as string | null) ?? 'UTC',
      digestDayOfWeek: (data.digestDayOfWeek as number | null) ?? null,
      alertEvaluationFrequencyMinutes: (data.alertEvaluationFrequencyMinutes as number | null) ?? null,
    },
    update: data as { digestEnabled?: boolean; digestFrequency?: string | null; digestTimeOfDay?: string | null; digestTimezone?: string | null; digestDayOfWeek?: number | null; alertEvaluationFrequencyMinutes?: number | null },
  });
  return NextResponse.json({
    digestEnabled: config.digestEnabled,
    digestFrequency: config.digestFrequency,
    digestTimeOfDay: config.digestTimeOfDay,
    digestTimezone: config.digestTimezone,
    digestDayOfWeek: config.digestDayOfWeek,
    alertEvaluationFrequencyMinutes: config.alertEvaluationFrequencyMinutes,
  });
}
