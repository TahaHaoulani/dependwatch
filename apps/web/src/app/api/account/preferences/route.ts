import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { getOrCreateUserPreference, updateUserPreference } from '@/lib/user-preference';
import { z } from 'zod';

const patchSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  timezone: z.string().max(64).optional(),
  dateFormat: z.string().max(32).nullable().optional(),
  defaultLandingPage: z.string().max(128).nullable().optional(),
  emailNotifications: z.boolean().optional(),
  billingNotifications: z.boolean().optional(),
  alertDigest: z.enum(['instant', 'daily', 'weekly']).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const prefs = await getOrCreateUserPreference(session.user.id);
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }
  const prefs = await updateUserPreference(session.user.id, parsed.data);
  return NextResponse.json(prefs);
}
