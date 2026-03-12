import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createWorkspace } from '@/lib/workspace';
import { z } from 'zod';

const bodySchema = z.object({ name: z.string().min(1).max(100) });

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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
  }
  try {
    const workspace = await createWorkspace(session.user.id, parsed.data.name);
    return NextResponse.json({ id: workspace.id, name: workspace.name, slug: workspace.slug });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { getWorkspacesForUser } = await import('@/lib/workspace');
  const workspaces = await getWorkspacesForUser(session.user.id);
  return NextResponse.json(workspaces);
}
