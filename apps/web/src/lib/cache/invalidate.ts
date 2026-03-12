/**
 * Cache invalidation for dashboard and related data. Call after writes that change metrics.
 * Also invalidates workspace/project short-TTL caches on mutation.
 */

import { cacheDel, cacheDelByPrefix, cacheKey } from './index';

const OVERVIEW_PREFIX = 'overview:';
const INTELLIGENCE_PREFIX = 'intelligence:';
const MCP_OVERVIEW_PREFIX = 'mcp:overview:';
const MCP_METRICS_PREFIX = 'mcp:metrics:';
const WORKSPACE_PREFIX = 'ws:';
const PROJECT_PREFIX = 'proj:';
const WSLIST_PREFIX = 'wslist:';
const PROJLIST_PREFIX = 'projlist:';

/** Invalidate overview, intelligence, and MCP overview/metrics caches for a project (e.g. after ingest or test events). */
export async function invalidateProjectDashboardCache(projectId: string): Promise<void> {
  await Promise.all([
    cacheDelByPrefix(OVERVIEW_PREFIX + projectId),
    cacheDelByPrefix(INTELLIGENCE_PREFIX + projectId),
    cacheDelByPrefix(MCP_OVERVIEW_PREFIX + projectId),
    cacheDelByPrefix(MCP_METRICS_PREFIX + projectId),
  ]);
}

/** Invalidate short-TTL workspace and subscription cache (call after updateWorkspace, createProject, subscription change). */
export async function invalidateWorkspaceCache(workspaceId: string): Promise<void> {
  await Promise.all([
    cacheDelByPrefix(WORKSPACE_PREFIX + workspaceId),
    cacheDel(cacheKey(['sub', workspaceId])),
  ]);
}

/** Invalidate subscription cache only (e.g. when Stripe webhook updates plan). */
export async function invalidateSubscriptionCache(workspaceId: string): Promise<void> {
  await cacheDel(cacheKey(['sub', workspaceId]));
}

/** Invalidate short-TTL project cache (call after project/API key mutations). */
export async function invalidateProjectCache(projectId: string): Promise<void> {
  await cacheDelByPrefix(PROJECT_PREFIX + projectId);
}

/** Invalidate workspace list cache for a user (call after create/delete workspace). */
export async function invalidateWorkspacesListCache(userId: string): Promise<void> {
  await cacheDelByPrefix(WSLIST_PREFIX + userId);
}

/** Invalidate projects list cache for a workspace (call after create/archive/delete project). */
export async function invalidateProjectsListCache(workspaceId: string): Promise<void> {
  await cacheDelByPrefix(PROJLIST_PREFIX + workspaceId);
}

