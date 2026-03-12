import { cache } from 'react';
import { prisma } from './db';
import { slugify } from './utils';
import { getWorkspaceSubscription } from './subscription';
import { cacheGet, cacheSet, cacheKey, reviveDates } from '@/lib/cache';
import { invalidateWorkspaceCache, invalidateWorkspacesListCache } from '@/lib/cache/invalidate';

export type WorkspaceRole = 'owner' | 'admin' | 'developer' | 'viewer';

const ADMIN_ROLES: WorkspaceRole[] = ['owner', 'admin'];
const OWNER_ONLY: WorkspaceRole[] = ['owner'];
const WORKSPACE_CACHE_TTL_SEC = 45;

async function getWorkspacesForUserDb(userId: string) {
  return prisma.workspace.findMany({
    where: {
      members: { some: { userId } },
    },
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/** Request-scoped + short-TTL cache for nav/switching. Invalidated on create/delete workspace. */
export const getWorkspacesForUser = cache(async (userId: string) => {
  const key = cacheKey(['wslist', userId]);
  const raw = await cacheGet(key);
  if (raw !== null) {
    try {
      return reviveDates(JSON.parse(raw)) as Awaited<ReturnType<typeof getWorkspacesForUserDb>>;
    } catch {
      // fall through
    }
  }
  const result = await getWorkspacesForUserDb(userId);
  await cacheSet(key, JSON.stringify(result), WORKSPACE_CACHE_TTL_SEC);
  return result;
});

async function getWorkspaceByIdDb(workspaceId: string, userId: string) {
  const ws = await prisma.workspace.findFirst({
    where: {
      id: workspaceId,
      members: { some: { userId } },
    },
    include: {
      subscription: true,
      _count: { select: { projects: true } },
    },
  });
  if (ws && !ws.subscription) {
    const sub = await getWorkspaceSubscription(workspaceId);
    (ws as { subscription: typeof sub }).subscription = sub;
  }
  return ws;
}

/** Request-scoped + short-TTL cache (Redis or in-memory). Ensures subscription exists. */
export const getWorkspaceById = cache(async (workspaceId: string, userId: string) => {
  const key = cacheKey(['ws', workspaceId, userId]);
  const raw = await cacheGet(key);
  if (raw !== null) {
    try {
      return reviveDates(JSON.parse(raw)) as Awaited<ReturnType<typeof getWorkspaceByIdDb>>;
    } catch {
      // fall through to DB
    }
  }
  const result = await getWorkspaceByIdDb(workspaceId, userId);
  if (result) await cacheSet(key, JSON.stringify(result), WORKSPACE_CACHE_TTL_SEC);
  return result;
});

export async function getWorkspaceMemberRole(
  workspaceId: string,
  userId: string
): Promise<WorkspaceRole | null> {
  const m = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  });
  return m ? (m.role as WorkspaceRole) : null;
}

/** Throws if user is not a member. */
export async function ensureWorkspaceAccess(workspaceId: string, userId: string) {
  const m = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!m) throw new Error('Forbidden');
}

/** Throws if user is not admin or owner. Use for billing, members, integrations, danger. */
export async function ensureWorkspaceAdmin(workspaceId: string, userId: string) {
  const role = await getWorkspaceMemberRole(workspaceId, userId);
  if (!role || !ADMIN_ROLES.includes(role)) throw new Error('Forbidden');
}

/** Throws if user is not owner. Use for delete workspace, transfer ownership. */
export async function ensureWorkspaceOwner(workspaceId: string, userId: string) {
  const role = await getWorkspaceMemberRole(workspaceId, userId);
  if (role !== 'owner') throw new Error('Forbidden');
}

/** Throws if user is viewer (read-only). Use for project edits, keys, alerts, webhooks. */
export async function ensureCanEditProject(workspaceId: string, userId: string) {
  const role = await getWorkspaceMemberRole(workspaceId, userId);
  if (!role || role === 'viewer') throw new Error('Forbidden');
}

export async function createWorkspace(userId: string, name: string) {
  const base = slugify(name);
  let slug = base;
  let n = 0;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      members: {
        create: { userId, role: 'owner' },
      },
    },
  });
  await prisma.subscription.create({
    data: {
      workspaceId: workspace.id,
      status: 'active',
      planId: 'free',
    },
  });
  await invalidateWorkspacesListCache(userId).catch(() => {});
  return workspace;
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  data: { name?: string; description?: string | null; slackWebhookUrl?: string | null }
) {
  await ensureWorkspaceAdmin(workspaceId, userId);
  const result = await prisma.workspace.update({
    where: { id: workspaceId },
    data,
  });
  await invalidateWorkspaceCache(workspaceId).catch(() => {});
  return result;
}

export async function listWorkspaceMembers(workspaceId: string, userId: string) {
  await ensureWorkspaceAccess(workspaceId, userId);
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateMemberRole(
  workspaceId: string,
  memberId: string,
  newRole: WorkspaceRole,
  actorUserId: string
) {
  await ensureWorkspaceAdmin(workspaceId, actorUserId);
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!member) throw new Error('Member not found');
  if (newRole === 'owner') throw new Error('Use transfer ownership to change owner');
  const actorRole = await getWorkspaceMemberRole(workspaceId, actorUserId);
  if (actorRole !== 'owner' && member.role === 'owner') throw new Error('Forbidden');
  return prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });
}

export async function removeMember(
  workspaceId: string,
  memberId: string,
  actorUserId: string
) {
  await ensureWorkspaceAdmin(workspaceId, actorUserId);
  const member = await prisma.workspaceMember.findFirst({
    where: { id: memberId, workspaceId },
  });
  if (!member) throw new Error('Member not found');
  if (member.role === 'owner') throw new Error('Cannot remove the owner');
  const actorRole = await getWorkspaceMemberRole(workspaceId, actorUserId);
  if (actorRole !== 'owner' && member.userId !== actorUserId) {
    throw new Error('Only owners can remove other members');
  }
  await prisma.workspaceMember.delete({ where: { id: memberId } });
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  await ensureWorkspaceOwner(workspaceId, userId);
  await prisma.workspace.delete({ where: { id: workspaceId } });
  await invalidateWorkspacesListCache(userId).catch(() => {});
}
