import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { decryptTotpSecret, verifyTotpCode, generateBackupCodes, hashBackupCodesForStorage } from '@/lib/mfa';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const bodySchema = z.object({ code: z.string().length(6).regex(/^\d+$/) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { pendingTotpSecretEncrypted: true, mfaEnabled: true },
  });
  if (!user?.pendingTotpSecretEncrypted) {
    return NextResponse.json({ error: 'No pending MFA enrollment. Start enrollment first.' }, { status: 400 });
  }
  if (user.mfaEnabled) {
    return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 });
  }
  const secret = decryptTotpSecret(user.pendingTotpSecretEncrypted);
  if (!verifyTotpCode(secret, parsed.data.code)) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
  const backupCodes = generateBackupCodes();
  const backupCodesHashed = hashBackupCodesForStorage(backupCodes);
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: true,
      totpSecretEncrypted: user.pendingTotpSecretEncrypted,
      pendingTotpSecretEncrypted: null,
      backupCodesHashed,
    },
  });
  await writeAuditLog({
    userId: session.user.id,
    action: 'mfa.enabled',
    resource: 'User',
    resourceId: session.user.id,
  });
  return NextResponse.json({ backupCodes });
}
