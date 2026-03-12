import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { decryptTotpSecret, verifyTotpCode, verifyAndConsumeBackupCode } from '@/lib/mfa';
import { writeAuditLog } from '@/lib/audit';
import { z } from 'zod';

const bodySchema = z.object({
  code: z.string().min(6).max(10),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, totpSecretEncrypted: true, backupCodesHashed: true },
  });
  if (!user?.mfaEnabled) {
    return NextResponse.json({ error: 'MFA is not enabled' }, { status: 400 });
  }
  const code = parsed.data.code.replace(/\s/g, '');
  let valid = false;
  if (code.length === 6 && /^\d+$/.test(code) && user.totpSecretEncrypted) {
    const secret = decryptTotpSecret(user.totpSecretEncrypted);
    valid = verifyTotpCode(secret, code);
  } else if (user.backupCodesHashed) {
    const result = verifyAndConsumeBackupCode(user.backupCodesHashed, code);
    valid = result.valid;
    if (valid && result.remainingHashesJson !== undefined) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { backupCodesHashed: result.remainingHashesJson },
      });
    }
  }
  if (!valid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      mfaEnabled: false,
      totpSecretEncrypted: null,
      pendingTotpSecretEncrypted: null,
      backupCodesHashed: null,
    },
  });
  await writeAuditLog({
    userId: session.user.id,
    action: 'mfa.disabled',
    resource: 'User',
    resourceId: session.user.id,
  });
  return NextResponse.json({ ok: true });
}
