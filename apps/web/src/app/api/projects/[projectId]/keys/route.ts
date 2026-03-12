import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createApiKey } from '@/lib/project';
import { writeAuditLog } from '@/lib/audit';
import { getProjectById } from '@/lib/project';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().max(64).optional(),
  environmentTag: z.string().max(32).optional().nullable(),
});

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
  const parsed = bodySchema.safeParse(body);
  const name = parsed.success && parsed.data.name ? parsed.data.name : 'New key';
  const environmentTag = parsed.success ? parsed.data.environmentTag ?? undefined : undefined;
  try {
    const project = await getProjectById(projectId, session.user.id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { key, prefix, id: keyId, name: keyName, environmentTag: tag } = await createApiKey(
      projectId,
      session.user.id,
      name,
      environmentTag
    );
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'api_key.created',
      resource: 'ProjectApiKey',
      resourceId: keyId,
      metadata: { name: keyName, environmentTag: tag ?? undefined },
    });
    return NextResponse.json({
      id: keyId,
      name: keyName,
      keyPrefix: prefix,
      key,
      environmentTag: tag ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create key';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 500 });
  }
}
