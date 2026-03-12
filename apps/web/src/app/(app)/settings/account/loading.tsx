import { AccountLoadingHeader } from '@/components/loading/dashboard-loading-ui';
import { SettingsLoadingContent } from '@/components/loading/dashboard-loading-ui';

export default function AccountSettingsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <AccountLoadingHeader />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <SettingsLoadingContent />
      </main>
    </div>
  );
}
