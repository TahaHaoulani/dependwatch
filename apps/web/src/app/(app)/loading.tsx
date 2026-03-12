import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shown when (app) segment is loading (e.g. first navigation into app).
 * Minimal so layout doesn't flash; content area only.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8" role="status" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
