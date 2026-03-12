import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { generateTotpSecret, encryptTotpSecret } from '@/lib/mfa';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, mfaEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (user.mfaEnabled) {
    return NextResponse.json({ error: 'MFA is already enabled' }, { status: 400 });
  }
  const email = user.email ?? session.user.email ?? 'user';
  const { secret, otpauthUrl } = generateTotpSecret(email);
  const encrypted = encryptTotpSecret(secret);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { pendingTotpSecretEncrypted: encrypted },
  });
  return NextResponse.json({ otpauthUrl });
}
