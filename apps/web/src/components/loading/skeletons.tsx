import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** KPI-style card placeholder */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        {lines === 1 ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Table row placeholder */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border/40 py-3">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1 min-w-0" />
      ))}
    </div>
  );
}

/** Chart area placeholder */
export function SkeletonChart({ height = 260 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-40 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  );
}

/** Table with header + rows */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="flex gap-4 border-b border-border/60 pb-2 mb-2">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Form fields placeholder */
export function SkeletonForm({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
      </div>
      {Array.from({ length: fields - 1 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
    </div>
  );
}

/** Page header + optional breadcrumb */
export function SkeletonPageHeader({ withBreadcrumb = true }: { withBreadcrumb?: boolean }) {
  return (
    <div className="space-y-2">
      {withBreadcrumb && (
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-xl" />
    </div>
  );
}
