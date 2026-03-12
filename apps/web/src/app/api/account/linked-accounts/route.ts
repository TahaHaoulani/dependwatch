import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';

const hasGoogle = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const hasGitHub = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

/** GET /api/account/linked-accounts — list OAuth accounts linked to the current user */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true, providerAccountId: true },
  });
  return NextResponse.json({
    accounts,
    availableProviders: { google: hasGoogle, github: hasGitHub },
  });
}

/** DELETE /api/account/linked-accounts — unlink one provider. Body: { provider: string } */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const provider = typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '';
  if (!provider || !['google', 'github'].includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  const all = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });
  if (all.length <= 1) {
    return NextResponse.json(
      { error: 'Cannot unlink your only sign-in method. Add another provider first.' },
      { status: 400 }
    );
  }
  await prisma.account.deleteMany({
    where: { userId: session.user.id, provider },
  });
  return NextResponse.json({ ok: true });
}
