import { DashboardLoadingHeader } from '@/components/loading/dashboard-loading-ui';
import { SettingsLoadingContent } from '@/components/loading/dashboard-loading-ui';

export default function WorkspaceSettingsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardLoadingHeader />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <SettingsLoadingContent />
      </main>
    </div>
  );
}
