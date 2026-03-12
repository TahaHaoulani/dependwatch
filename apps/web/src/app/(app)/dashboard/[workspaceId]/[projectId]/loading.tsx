import { DashboardLoadingHeader, DashboardLoadingContent } from '@/components/loading/dashboard-loading-ui';

export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardLoadingHeader />
      <DashboardLoadingContent />
    </div>
  );
}
