import { auth } from '@/lib/auth-server';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

interface StaticPageLayoutProps {
  children: React.ReactNode;
  /** Optional max-width class for main content (default: max-w-3xl) */
  className?: string;
}

/**
 * Shared layout for legal, support, and static content pages.
 * Provides MarketingHeader (with server-side auth for nav), constrained main content, and MarketingFooter.
 */
export async function StaticPageLayout({ children, className }: StaticPageLayoutProps) {
  const session = await auth();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingHeader isAuthenticated={!!session?.user} />
      <main className={`static-page container mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 md:py-12 pb-16 md:pb-20 ${className ?? ''}`}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
