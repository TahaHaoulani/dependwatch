'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

const ACTION_LABELS: Record<string, string> = {
  'api_key.created': 'API key created',
  'api_key.rotated': 'API key rotated',
  'api_key.revoked': 'API key revoked',
  'member.invited': 'Member invited',
  'member.role_changed': 'Member role changed',
  'member.removed': 'Member removed',
  'member.invite_revoked': 'Invite revoked',
  'member.joined': 'Member joined',
  'workspace.updated': 'Workspace updated',
  'workspace.deleted': 'Workspace deleted',
  'project.created': 'Project created',
  'project.updated': 'Project updated',
  'project.deleted': 'Project deleted',
  'webhook.created': 'Slack webhook added',
  'webhook.updated': 'Slack webhook updated',
  'webhook.removed': 'Slack webhook removed',
  'alert_rule.created': 'Alert rule created',
  'alert_rule.updated': 'Alert rule updated',
  'alert_rule.removed': 'Alert rule removed',
  'mfa.enabled': 'MFA enabled',
  'mfa.disabled': 'MFA disabled',
  'session.revoked_all': 'All sessions revoked',
};

type Entry = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  projectId: string | null;
  metadata: unknown;
  createdAt: Date;
};

type UserMap = Record<string, { name: string | null; email: string | null }>;

function formatActor(userId: string | null, userMap: UserMap): string {
  if (!userId) return 'System';
  const u = userMap[userId];
  if (!u) return 'Unknown user';
  if (u.name?.trim()) return u.name;
  return u.email ?? userId.slice(0, 8);
}

function formatDetails(action: string, metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  if (action === 'member.role_changed' && m.newRole && m.previousRole) {
    return `${String(m.previousRole)} → ${String(m.newRole)}${m.memberEmail ? ` (${m.memberEmail})` : ''}`;
  }
  if (action === 'member.removed' && m.memberEmail) return String(m.memberEmail);
  if (action === 'member.invited' && m.inviteeEmail) return String(m.inviteeEmail);
  if (m.name) return String(m.name);
  return null;
}

export function ActivityLogClient({
  workspaceId,
  initialEntries,
  initialUserMap,
}: {
  workspaceId: string;
  initialEntries: Entry[];
  initialUserMap: UserMap;
}) {
  const label = (action: string) => ACTION_LABELS[action] ?? action;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Last 50 sensitive actions. Keys, members, webhooks, and workspace or project changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {initialEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {initialEntries.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <span className="font-medium">{label(e.action)}</span>
                {formatDetails(e.action, e.metadata) && (
                  <span className="text-muted-foreground">{formatDetails(e.action, e.metadata)}</span>
                )}
                <span className="text-muted-foreground text-xs">
                  {formatActor(e.userId, initialUserMap)} · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
