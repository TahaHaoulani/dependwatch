import { auth } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getInviteByToken } from '@/lib/workspace-invite';
import { InviteAcceptClient } from '@/components/invite/invite-accept-client';

export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    redirect('/login');
  }
  const session = await auth();
  const base = process.env.NEXTAUTH_URL ?? '';
  const loginUrl = `${base.replace(/\/$/, '')}/api/auth/signin?callbackUrl=${encodeURIComponent(`/invite/accept?token=${encodeURIComponent(token)}`)}`;

  const invite = await getInviteByToken(token);
  const inviteInfo = invite
    ? { workspaceName: invite.workspace.name, email: invite.email, role: invite.role }
    : null;

  if (!inviteInfo) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-xl font-semibold">Invalid or expired invite</h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          This invite link is invalid or has expired. Ask the workspace owner for a new invite.
        </p>
        <Link href="/" className="text-sm text-primary underline">
          Go to home
        </Link>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <h1 className="text-xl font-semibold">You&apos;re invited</h1>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          You&apos;ve been invited to join <strong>{inviteInfo.workspaceName}</strong>. Sign in to accept.
        </p>
        <Link
          href={loginUrl}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in to accept
        </Link>
      </div>
    );
  }

  return (
    <InviteAcceptClient
      token={token}
      workspaceName={inviteInfo.workspaceName}
      userEmail={session.user.email ?? ''}
    />
  );
}
