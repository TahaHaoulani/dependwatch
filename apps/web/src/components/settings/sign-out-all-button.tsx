'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut, ShieldOff } from 'lucide-react';

export function SignOutAllButton() {
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: '/' })}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign out
    </Button>
  );
}

export function RevokeAllSessionsButton() {
  const [loading, setLoading] = useState(false);

  const revokeAll = async () => {
    if (!confirm('Sign out on all devices? You will need to sign in again here.')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/account/sessions/revoke-all', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      await signOut({ callbackUrl: '/login' });
    } catch {
      setLoading(false);
    }
  };

  return (
    <Button variant="destructive" onClick={revokeAll} disabled={loading}>
      <ShieldOff className="mr-2 h-4 w-4" />
      {loading ? 'Signing out…' : 'Sign out all sessions'}
    </Button>
  );
}
