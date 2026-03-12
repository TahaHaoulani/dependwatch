import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createApiKey, revokeApiKey } from '@/lib/project';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { getProjectById } from '@/lib/project';
import { z } from 'zod';

const bodySchema = z.object({ keyIdToRevoke: z.string().cuid() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'keyIdToRevoke required' }, { status: 400 });
  }
  const { keyIdToRevoke } = parsed.data;
  const oldKey = await prisma.projectApiKey.findFirst({
    where: { id: keyIdToRevoke, projectId },
    select: { name: true, environmentTag: true },
  });
  const name = oldKey?.name ?? 'Default';
  const environmentTag = oldKey?.environmentTag ?? undefined;
  try {
    const { key, prefix, id: keyId, name: keyName, environmentTag: tag } = await createApiKey(
      projectId,
      session.user.id,
      name,
      environmentTag
    );
    await prisma.projectApiKey.update({
      where: { id: keyId },
      data: { rotatedAt: new Date() },
    });
    await revokeApiKey(keyIdToRevoke, session.user.id);
    await writeAuditLog({
      workspaceId: project.workspaceId,
      projectId,
      userId: session.user.id,
      action: 'api_key.rotated',
      resource: 'ProjectApiKey',
      resourceId: keyId,
      metadata: { name: keyName, previousKeyId: keyIdToRevoke },
    });
    return NextResponse.json({
      id: keyId,
      name: keyName,
      keyPrefix: prefix,
      key,
      environmentTag: tag ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to rotate key';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 500 });
  }
}
