'use client';

import dynamic from 'next/dynamic';
import { DashboardLoadingContent } from '@/components/loading/dashboard-loading-ui';
import type { ApiKeyInfo } from './dashboard-types';

const DashboardView = dynamic(
  () => import('./dashboard-view').then((m) => ({ default: m.DashboardView })),
  {
    ssr: false,
    loading: () => <DashboardLoadingContent />,
  }
);

export type DashboardViewLoaderProps = {
  projectId: string;
  workspaceId: string;
  range: string;
  retentionDays?: number;
  project: { id: string; name: string; apiKeys: ApiKeyInfo[] };
};

/**
 * Lazy-loads DashboardView so the project dashboard route chunk stays small.
 * Heavy dashboard (charts, tables, useQueries) loads after first paint.
 */
export function DashboardViewLoader(props: DashboardViewLoaderProps) {
  return <DashboardView {...props} />;
}
