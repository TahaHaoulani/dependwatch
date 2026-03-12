import { randomBytes, createHash } from 'crypto';
import { prisma } from './db';
import { ensureWorkspaceAdmin } from './workspace';
import type { WorkspaceRole } from './workspace';

const INVITE_ROLES: WorkspaceRole[] = ['admin', 'developer', 'viewer'];
const DEFAULT_EXPIRY_DAYS = 7;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateInviteToken(): { token: string; tokenHash: string; tokenPrefix: string } {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const tokenPrefix = token.slice(0, 12) + '…';
  return { token, tokenHash, tokenPrefix };
}

export async function createInvite(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
  invitedByUserId: string
) {
  await ensureWorkspaceAdmin(workspaceId, invitedByUserId);
  if (!INVITE_ROLES.includes(role)) {
    throw new Error('Invalid role');
  }
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) throw new Error('Email is required');

  const existing = await prisma.workspaceInvite.findFirst({
    where: {
      workspaceId,
      email: emailNorm,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) {
    throw new Error('A pending invite already exists for this email');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);
  const { token, tokenHash, tokenPrefix } = generateInviteToken();

  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId,
      email: emailNorm,
      role,
      invitedByUserId,
      tokenHash,
      tokenPrefix,
      expiresAt,
    },
  });
  return { invite, token };
}

export async function listPendingInvites(workspaceId: string, userId: string) {
  await ensureWorkspaceAdmin(workspaceId, userId);
  return prisma.workspaceInvite.findMany({
    where: {
      workspaceId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function revokeInvite(inviteId: string, workspaceId: string, userId: string) {
  await ensureWorkspaceAdmin(workspaceId, userId);
  const invite = await prisma.workspaceInvite.findFirst({
    where: { id: inviteId, workspaceId },
  });
  if (!invite) throw new Error('Invite not found');
  if (invite.acceptedAt) throw new Error('Invite already accepted');
  await prisma.workspaceInvite.delete({ where: { id: inviteId } });
}

export async function getInviteByToken(token: string) {
  const tokenHash = hashToken(token);
  const invite = await prisma.workspaceInvite.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      workspace: { select: { id: true, name: true } },
    },
  });
  return invite;
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await getInviteByToken(token);
  if (!invite) throw new Error('Invalid or expired invite');

  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: invite.workspaceId, userId },
  });
  if (existingMember) throw new Error('You are already a member of this workspace');

  await prisma.$transaction([
    prisma.workspaceMember.create({
      data: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
    }),
    prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return { workspaceId: invite.workspaceId, workspaceName: invite.workspace.name };
}
