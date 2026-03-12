import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { createProject } from '@/lib/project';
import { z } from 'zod';

const bodySchema = z.object({ name: z.string().min(1).max(100) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { workspaceId } = await params;
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
    const { project, key } = await createProject(
      workspaceId,
      session.user.id,
      parsed.data.name
    );
    return NextResponse.json({
      id: project.id,
      name: project.name,
      slug: project.slug,
      ingestKey: key,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
