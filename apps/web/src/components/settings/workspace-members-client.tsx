'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2, ChevronDown } from 'lucide-react';
import type { WorkspaceRole } from '@/lib/workspace';

const ROLES: { value: WorkspaceRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Viewer' },
];

const canManageRoles = (role: string) => role === 'owner' || role === 'admin';

const INVITE_ROLES: { value: 'admin' | 'developer' | 'viewer'; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Viewer' },
];

type Member = {
  id: string;
  role: string;
  userId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type PendingInvite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
};

export function WorkspaceMembersClient({
  workspaceId,
  members: initialMembers,
  pendingInvites: initialPending,
  currentUserId,
  currentUserRole,
  canManage,
  canInviteByPlan = true,
}: {
  workspaceId: string;
  members: Member[];
  pendingInvites: PendingInvite[];
  currentUserId: string;
  currentUserRole: string;
  canManage: boolean;
  canInviteByPlan?: boolean;
}) {
  const { toast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [pendingInvites, setPendingInvites] = useState(initialPending);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'developer' | 'viewer'>('developer');
  const [inviting, setInviting] = useState(false);
  const [revokingInvite, setRevokingInvite] = useState<string | null>(null);

  const updateRole = async (memberId: string, role: WorkspaceRole) => {
    if (role === 'owner') return;
    setChangingRole(memberId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
      toast({ title: 'Role updated' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update role',
        variant: 'destructive',
      });
    } finally {
      setChangingRole(null);
    }
  };

  const removeMember = async (memberId: string) => {
    setRemoving(memberId);
    setConfirmRemove(null);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast({ title: 'Member removed' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to remove member',
        variant: 'destructive',
      });
    } finally {
      setRemoving(null);
    }
  };

  const sendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Failed');
      setPendingInvites((prev) => [
        { id: d.id, email: d.email, role: d.role, expiresAt: d.expiresAt, createdAt: d.createdAt },
        ...prev,
      ]);
      setInviteEmail('');
      toast({ title: 'Invite sent', description: `An email was sent to ${email}.` });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to send invite',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setRevokingInvite(inviteId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invites/${inviteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed');
      }
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast({ title: 'Invite revoked' });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to revoke',
        variant: 'destructive',
      });
    } finally {
      setRevokingInvite(null);
    }
  };

  return (
    <>
      {canManage && (
        <Card>
          {!canInviteByPlan && (
            <div className="rounded-t-lg border-b border-border bg-muted/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                You can only invite workspace members on the Pro plan.{' '}
                <Link
                  href={`/dashboard/${workspaceId}/settings/billing`}
                  className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                >
                  More information
                </Link>
              </p>
            </div>
          )}
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Invite by email</CardTitle>
            <CardDescription className="mt-1">
              Send an invite link. The recipient must sign in to accept; they will join with the role you choose.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="invite-email" className="sr-only">Email</label>
                <input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!canInviteByPlan}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
              <Select
                value={inviteRole}
                onValueChange={(v) => setInviteRole(v as 'admin' | 'developer' | 'viewer')}
                disabled={!canInviteByPlan}
              >
                <SelectTrigger className="h-9 min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim() || !canInviteByPlan}
              >
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && pendingInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Pending invites</CardTitle>
            <CardDescription className="mt-1">
              Invites expire after 7 days. Revoke to cancel or resend a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {pendingInvites.map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{i.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {INVITE_ROLES.find((r) => r.value === i.role)?.label ?? i.role} · Expires {new Date(i.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revokeInvite(i.id)}
                    disabled={revokingInvite === i.id}
                  >
                    {revokingInvite === i.id ? 'Revoking…' : 'Revoke'}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription className="mt-1">
            {canManageRoles(currentUserRole)
              ? 'Manage roles and remove members. Owners cannot be removed.'
              : 'You can view members. Only admins and owners can make changes.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="divide-y divide-border">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {m.image ? (
                      <img
                        src={m.image}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      (m.name ?? m.email ?? '?').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{m.name || m.email || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && m.role !== 'owner' ? (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={!!changingRole}>
                            {ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ROLES.filter((r) => r.value !== 'owner').map((r) => (
                            <DropdownMenuItem
                              key={r.value}
                              onClick={() => updateRole(m.id, r.value)}
                              disabled={changingRole === m.id}
                            >
                              {r.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {m.userId !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmRemove(m)}
                          disabled={!!removing}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  ) : (
                      <span className="rounded-md border border-border px-2 py-1 text-sm text-muted-foreground">
                        {ROLES.find((r) => r.value === m.role)?.label ?? m.role}
                      </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member</DialogTitle>
            <DialogDescription>
              {confirmRemove?.name || confirmRemove?.email} will lose access to this workspace. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemove && removeMember(confirmRemove.id)}
              disabled={!!removing}
            >
              {removing ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
