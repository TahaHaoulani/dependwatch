import { randomBytes, createHash } from 'crypto';
import { cache } from 'react';
import { prisma } from './db';
import { slugify } from './utils';
import { ensureWorkspaceAccess, ensureCanEditProject } from './workspace';
import { cacheGet, cacheSet, cacheKey, reviveDates } from '@/lib/cache';
import { invalidateProjectCache, invalidateWorkspaceCache, invalidateProjectsListCache } from '@/lib/cache/invalidate';

const INGEST_KEY_PREFIX = 'dw_live_';
const PROJECT_CACHE_TTL_SEC = 45;

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateIngestKey(): { key: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const key = `${INGEST_KEY_PREFIX}${secret}`;
  const hash = hashKey(key);
  const prefix = key.slice(0, 12) + '…';
  return { key, prefix, hash };
}

async function getProjectsForWorkspaceDb(workspaceId: string, userId: string) {
  await ensureWorkspaceAccess(workspaceId, userId);
  return prisma.project.findMany({
    where: { workspaceId, archivedAt: null },
    orderBy: { createdAt: 'asc' },
  });
}

/** Request-scoped + short-TTL cache for nav/settings. Invalidated on create/archive/delete project. */
export const getProjectsForWorkspace = cache(async (workspaceId: string, userId: string) => {
  const key = cacheKey(['projlist', workspaceId, userId]);
  const raw = await cacheGet(key);
  if (raw !== null) {
    try {
      return reviveDates(JSON.parse(raw)) as Awaited<ReturnType<typeof getProjectsForWorkspaceDb>>;
    } catch {
      // fall through
    }
  }
  const result = await getProjectsForWorkspaceDb(workspaceId, userId);
  await cacheSet(key, JSON.stringify(result), PROJECT_CACHE_TTL_SEC);
  return result;
});

/** Ensures the workspace has at least one project. Creates "My Project" if none exist. Returns the first project. */
export async function ensureDefaultProject(workspaceId: string, userId: string) {
  const projects = await getProjectsForWorkspace(workspaceId, userId);
  if (projects.length > 0) return projects[0];
  const { project } = await createProject(workspaceId, userId, 'My Project');
  return project;
}

async function getProjectByIdDb(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      workspace: { members: { some: { userId } } },
    },
    include: {
      workspace: true,
      apiKeys: { select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, rotatedAt: true, createdAt: true, environmentTag: true } },
    },
  });
}

/** Request-scoped + short-TTL cache (Redis or in-memory). */
export const getProjectById = cache(async (projectId: string, userId: string) => {
  const key = cacheKey(['proj', projectId, userId]);
  const raw = await cacheGet(key);
  if (raw !== null) {
    try {
      return reviveDates(JSON.parse(raw)) as Awaited<ReturnType<typeof getProjectByIdDb>>;
    } catch {
      // fall through to DB
    }
  }
  const result = await getProjectByIdDb(projectId, userId);
  if (result) await cacheSet(key, JSON.stringify(result), PROJECT_CACHE_TTL_SEC);
  return result;
});

export async function createProject(
  workspaceId: string,
  userId: string,
  name: string
) {
  await ensureWorkspaceAccess(workspaceId, userId);
  const base = slugify(name);
  let slug = base;
  let n = 0;
  const existing = await prisma.project.findMany({ where: { workspaceId } });
  const slugs = new Set(existing.map((p) => p.slug));
  while (slugs.has(slug)) slug = `${base}-${++n}`;

  const project = await prisma.project.create({
    data: { name, slug, workspaceId },
  });

  const { key, prefix, hash } = generateIngestKey();
  await prisma.projectApiKey.create({
    data: {
      projectId: project.id,
      name: 'Default',
      keyPrefix: prefix,
      keyHash: hash,
    },
  });
  await invalidateWorkspaceCache(workspaceId).catch(() => {});
  return { project, key };
}

export async function revokeApiKey(
  keyId: string,
  userId: string
) {
  const key = await prisma.projectApiKey.findFirst({
    where: { id: keyId },
    include: { project: true },
  });
  if (!key) throw new Error('Not found');
  await ensureCanEditProject(key.project.workspaceId, userId);
  await prisma.projectApiKey.delete({ where: { id: keyId } });
  await invalidateProjectCache(key.projectId).catch(() => {});
}

export async function createApiKey(
  projectId: string,
  userId: string,
  name: string,
  environmentTag?: string | null
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: { workspace: true },
  });
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  const { key, prefix, hash } = generateIngestKey();
  const tag = environmentTag?.trim() || null;
  const created = await prisma.projectApiKey.create({
    data: {
      projectId,
      name: name || 'New key',
      keyPrefix: prefix,
      keyHash: hash,
      environmentTag: tag || undefined,
    },
  });
  return { key, prefix, id: created.id, name: created.name, environmentTag: created.environmentTag };
}

export async function verifyIngestKey(key: string): Promise<string | null> {
  if (!key.startsWith(INGEST_KEY_PREFIX)) return null;
  const hash = hashKey(key);
  const apiKey = await prisma.projectApiKey.findFirst({
    where: { keyHash: hash },
    select: { projectId: true },
  });
  if (!apiKey) return null;
  await prisma.projectApiKey.updateMany({
    where: { keyHash: hash },
    data: { lastUsedAt: new Date() },
  });
  return apiKey.projectId;
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    name?: string;
    slug?: string;
    description?: string | null;
    environment?: string | null;
    retentionDaysOverride?: number | null;
  }
) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  const result = await prisma.project.update({
    where: { id: projectId },
    data,
  });
  await invalidateProjectCache(projectId).catch(() => {});
  await invalidateProjectsListCache(project.workspaceId).catch(() => {});
  return result;
}

export async function archiveProject(projectId: string, userId: string) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  const result = await prisma.project.update({
    where: { id: projectId },
    data: { archivedAt: new Date() },
  });
  await invalidateProjectCache(projectId).catch(() => {});
  return result;
}

export async function deleteProject(projectId: string, userId: string) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('Not found');
  const { ensureWorkspaceAdmin } = await import('./workspace');
  await ensureWorkspaceAdmin(project.workspaceId, userId);
  await prisma.project.delete({ where: { id: projectId } });
  await invalidateProjectCache(projectId).catch(() => {});
  await invalidateWorkspaceCache(project.workspaceId).catch(() => {});
  await invalidateProjectsListCache(project.workspaceId).catch(() => {});
}
