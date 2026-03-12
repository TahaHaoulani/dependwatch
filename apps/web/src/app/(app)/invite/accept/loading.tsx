import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Shown while invite accept page is loading (token validation, session).
 */
export default function InviteAcceptLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" role="status" aria-label="Loading">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
