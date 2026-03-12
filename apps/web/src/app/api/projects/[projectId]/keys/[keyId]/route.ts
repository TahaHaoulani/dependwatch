import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { revokeApiKey } from '@/lib/project';
import { writeAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; keyId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { keyId } = await params;
  const key = await prisma.projectApiKey.findFirst({
    where: { id: keyId },
    include: { project: true },
  });
  if (!key) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await revokeApiKey(keyId, session.user.id);
    await writeAuditLog({
      workspaceId: key.project.workspaceId,
      projectId: key.projectId,
      userId: session.user.id,
      action: 'api_key.revoked',
      resource: 'ProjectApiKey',
      resourceId: keyId,
      metadata: { keyPrefix: key.keyPrefix },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found';
    return NextResponse.json({ error: msg }, { status: msg === 'Forbidden' ? 403 : 404 });
  }
}
