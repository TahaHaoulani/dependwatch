import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Shared loading UI for dashboard and settings routes.
 * Keeps loading states consistent and premium (skeleton + layout shape).
 */

export function DashboardLoadingHeader() {
  return (
    <header className="border-b border-border/40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-lg">◇</span>
            DependWatch
          </Link>
          <div className="h-8 w-32 rounded bg-muted animate-pulse" aria-hidden />
        </div>
        <div className="h-9 w-[220px] rounded-md bg-muted animate-pulse" aria-hidden />
      </div>
    </header>
  );
}

export function DashboardLoadingContent() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-8" role="status" aria-label="Loading dashboard">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-20 rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 rounded bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-5 w-28 rounded bg-muted animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted/80 animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-[260px] rounded-lg bg-muted/50 animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-5 w-24 rounded bg-muted animate-pulse" />
            <div className="h-4 w-36 rounded bg-muted/80 animate-pulse mt-2" />
          </CardHeader>
          <CardContent>
            <div className="h-[260px] rounded-lg bg-muted/50 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function SettingsLoadingContent() {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12" role="status" aria-label="Loading settings">
      <aside className="w-full shrink-0 lg:w-52">
        <div className="rounded-lg border border-border/60 bg-card/50 p-2 lg:py-3 space-y-5">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <ul className="space-y-0.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <li key={i} className="h-9 rounded-md bg-muted/60 animate-pulse" />
            ))}
          </ul>
        </div>
      </aside>
      <div className="min-w-0 flex-1 max-w-3xl space-y-6">
        <div className="flex items-center gap-1.5 h-5">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-4 w-4 rounded bg-muted/60 animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full max-w-xl rounded bg-muted/80 animate-pulse" />
        <div className="space-y-4 pt-4">
          <div className="h-10 w-full rounded-md bg-muted/50 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-muted/50 animate-pulse" />
          <div className="h-24 w-full rounded-md bg-muted/30 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function AccountLoadingHeader() {
  return (
    <header className="border-b border-border/40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-lg">◇</span>
            DependWatch
          </Link>
          <div className="h-4 w-32 rounded bg-muted animate-pulse" aria-hidden />
        </div>
        <div className="h-9 w-[220px] rounded-md bg-muted animate-pulse" aria-hidden />
      </div>
    </header>
  );
}
