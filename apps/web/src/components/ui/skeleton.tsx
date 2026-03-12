import { cn } from '@/lib/utils';

/**
 * Base skeleton for loading placeholders. Use with consistent rounded/size classes.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}

export { Skeleton };
