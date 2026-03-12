import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { invalidateSessionVersionCache } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

/** POST /api/account/sessions/revoke-all — increment sessionVersion to invalidate all JWTs (all sessions). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await invalidateSessionVersionCache(session.user.id);
  await writeAuditLog({
    userId: session.user.id,
    action: 'session.revoked_all',
    resource: 'User',
    resourceId: session.user.id,
    metadata: { sessionVersion: updated.sessionVersion },
  });
  return NextResponse.json({ ok: true });
}
