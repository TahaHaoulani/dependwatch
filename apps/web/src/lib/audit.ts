/**
 * Audit log for sensitive actions. All writes are fire-and-forget; failures are logged but do not block the operation.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './db';

export type AuditAction =
  | 'api_key.created'
  | 'api_key.rotated'
  | 'api_key.revoked'
  | 'member.invited'
  | 'member.role_changed'
  | 'member.removed'
  | 'member.invite_revoked'
  | 'member.joined' // accepted invite
  | 'workspace.updated'
  | 'workspace.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'webhook.created'
  | 'webhook.updated'
  | 'webhook.removed'
  | 'alert_rule.created'
  | 'alert_rule.updated'
  | 'alert_rule.removed'
  | 'mfa.enabled'
  | 'mfa.disabled'
  | 'session.revoked_all';

export async function writeAuditLog(params: {
  workspaceId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId ?? null,
        projectId: params.projectId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error('[AuditLog] write failed', params.action, e);
  }
}

export async function getWorkspaceActivity(workspaceId: string, limit: number = 50) {
  return prisma.auditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getProjectActivity(projectId: string, limit: number = 30) {
  return prisma.auditLog.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUserActivity(userId: string, limit: number = 30) {
  return prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
