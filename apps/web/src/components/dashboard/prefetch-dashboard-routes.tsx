'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Prefetches settings, MCP, and workspace routes when the user is in a project.
 * Makes navigation to those pages feel instant (RSC payload already in client cache).
 */
export function PrefetchDashboardRoutes({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const paths = [
      `/dashboard/${workspaceId}/${projectId}/settings`,
      `/dashboard/${workspaceId}/${projectId}/settings/general`,
      `/dashboard/${workspaceId}/${projectId}/mcp`,
      `/dashboard/${workspaceId}/settings`,
      `/dashboard/${workspaceId}/billing`,
    ];
    paths.forEach((path) => router.prefetch(path));
  }, [router, workspaceId, projectId]);

  return null;
}
