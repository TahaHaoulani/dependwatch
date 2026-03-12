import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { verifyIngestKey } from '@/lib/project';
import { batchSchema } from '@/lib/ingest-schema';
import { ingestEventsForProject } from '@/lib/ingest-service';
import { getPlanLimits } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import type { PlanId } from '@/lib/stripe';
import { EVENT_LIMITS } from '@/lib/pricing-constants';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const key = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : req.headers.get('x-dependwatch-key') ?? '';

  const projectId = await verifyIngestKey(key);
  if (!projectId) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(`ingest:${projectId}`, {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
  });
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  let allowedProviders: Set<string> | null = null;
  let eventsToIngest = parsed.data.events;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (project) {
    const { getWorkspaceSubscription } = await import('@/lib/subscription');
    const sub = await getWorkspaceSubscription(project.workspaceId);
    const planId = (sub.planId ?? 'free') as PlanId;
    const limits = getPlanLimits(planId);

    if (planId === 'free') {
      const eventsThisMonth = await prisma.apiCallEvent.count({
        where: { projectId, timestamp: { gte: monthStart, lte: monthEnd }, source: { not: 'demo' } },
      });
      if (eventsThisMonth >= EVENT_LIMITS.free) {
        const overage = eventsThisMonth - EVENT_LIMITS.free;
        const sampleRate = Math.max(0.1, EVENT_LIMITS.free / (eventsThisMonth + 1));
        eventsToIngest = eventsToIngest.filter(() => Math.random() < sampleRate);
      }
    }

    if (typeof limits.maxProviders === 'number' && limits.maxProviders >= 0) {
      const groups = await prisma.apiCallEvent.groupBy({
        by: ['provider'],
        where: { projectId, timestamp: { gte: monthStart, lte: monthEnd }, source: { not: 'demo' } },
        _count: true,
      });
      groups.sort((a, b) => (b._count?.provider ?? 0) - (a._count?.provider ?? 0));
      const top = groups.slice(0, limits.maxProviders).map((g) => g.provider.toLowerCase());
      const incomingProviders = [...new Set(eventsToIngest.map((e) => String(e.provider).toLowerCase()))];
      const existingSet = new Set(groups.map((g) => g.provider.toLowerCase()));
      for (const p of incomingProviders) {
        if (!existingSet.has(p)) {
          if (top.length >= limits.maxProviders) break;
          top.push(p);
          existingSet.add(p);
        }
      }
      allowedProviders = new Set(top.slice(0, limits.maxProviders));
    }
  }

  const freePlanSampled = eventsToIngest.length < parsed.data.events.length;

  try {
    const { count, skipped } = await ingestEventsForProject(projectId, eventsToIngest, {
      source: 'sdk',
      allowedProviders,
    });
    return NextResponse.json({
      ok: true,
      received: count,
      ...(skipped != null && skipped > 0 ? { skipped, message: 'Some events were skipped (API limit for your plan).' } : {}),
      ...(freePlanSampled ? { sampled: true, message: 'Free plan event limit reached; events are sampled to stay within 10k/month.' } : {}),
    });
  } catch (err) {
    console.error('[ingest]', err);
    return NextResponse.json({ error: 'Ingestion failed' }, { status: 500 });
  }
}
