import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createMcpToken, listMcpTokensForUser } from '@/lib/mcp-token';
import { z } from 'zod';
import { ensureWorkspaceAccess } from '@/lib/workspace';

const createSchema = z.object({
  label: z.string().min(1).max(100),
  workspaceId: z.string().optional().nullable(),
  scopes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const workspaceId = new URL(req.url).searchParams.get('workspaceId') ?? undefined;
  const tokens = await listMcpTokensForUser(session.user.id, workspaceId ?? null);
  return NextResponse.json({ tokens });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const { label, workspaceId, scopes } = parsed.data;
  if (workspaceId) {
    await ensureWorkspaceAccess(workspaceId, session.user.id);
  }
  try {
    const created = await createMcpToken(session.user.id, {
      label,
      workspaceId: workspaceId ?? null,
      scopes,
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error('[mcp tokens] create', e);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
