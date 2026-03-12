import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { revokeMcpToken } from '@/lib/mcp-token';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { tokenId } = await params;
  const ok = await revokeMcpToken(tokenId, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: 'Token not found or already revoked' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
