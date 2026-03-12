import { DashboardLoadingHeader, DashboardLoadingContent } from '@/components/loading/dashboard-loading-ui';

/**
 * Shown when /dashboard is loading (resolving default workspace/project before redirect).
 * Keeps navigation to Dashboard feeling responsive.
 */
export default function DashboardEntryLoading() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardLoadingHeader />
      <DashboardLoadingContent />
    </div>
  );
}
