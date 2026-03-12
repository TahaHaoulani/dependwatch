'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function InviteAcceptClient({
  token,
  workspaceName,
  userEmail,
}: {
  token: string;
  workspaceName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to accept invite');
      }
      router.push(`/dashboard/${data.workspaceId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-xl font-semibold">Accept invite</h1>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        You&apos;ve been invited to join <strong>{workspaceName}</strong>.
        {userEmail && (
          <> This invite was sent to <strong>{userEmail}</strong>.</>
        )}
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button loading={loading} onClick={accept}>
        {loading ? 'Accepting…' : 'Accept invite'}
      </Button>
      <Link href="/dashboard" className="text-sm text-muted-foreground underline">
        Cancel and go to dashboard
      </Link>
    </div>
  );
}
