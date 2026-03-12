'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error(error);
    }
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground font-sans flex flex-col items-center justify-center gap-4 px-4">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-center text-muted-foreground max-w-md">
          Something went wrong. Refresh the page or go back home to continue.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  );
}
