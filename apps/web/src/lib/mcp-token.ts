import { createHash, randomBytes } from 'crypto';
import { prisma } from './db';
import { ensureWorkspaceAccess } from './workspace';

const MCP_TOKEN_PREFIX = 'dw_mcp_';
const DEFAULT_SCOPES = 'docs:read,projects:read,projects:test-event,metrics:read';

export function hashMcpToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateMcpToken(): { token: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const token = `${MCP_TOKEN_PREFIX}${secret}`;
  const hash = hashMcpToken(token);
  const prefix = token.slice(0, 14) + '…';
  return { token, prefix, hash };
}

export type McpTokenScopes = 'docs:read' | 'projects:read' | 'projects:test-event' | 'metrics:read';

export function parseScopes(scopes: string): Set<McpTokenScopes> {
  const allowed = new Set<McpTokenScopes>(['docs:read', 'projects:read', 'projects:test-event', 'metrics:read']);
  return new Set(
    scopes
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is McpTokenScopes => allowed.has(s as McpTokenScopes))
  );
}

export function hasScope(tokenScopes: string, required: McpTokenScopes): boolean {
  return parseScopes(tokenScopes).has(required);
}

export async function createMcpToken(
  userId: string,
  options: {
    label: string;
    workspaceId?: string | null;
    scopes?: string;
  }
) {
  if (options.workspaceId) {
    await ensureWorkspaceAccess(options.workspaceId, userId);
  }
  const { token, prefix, hash } = generateMcpToken();
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  const created = await prisma.mcpAccessToken.create({
    data: {
      userId,
      label: options.label.slice(0, 100),
      tokenHash: hash,
      tokenPrefix: prefix,
      workspaceId: options.workspaceId ?? null,
      scopes,
    },
  });
  return {
    id: created.id,
    token,
    prefix: created.tokenPrefix,
    label: created.label,
    scopes: created.scopes,
    createdAt: created.createdAt,
  };
}

const MIN_TOKEN_LENGTH = 30; // prefix + minimum secret length

export async function verifyMcpToken(rawToken: string): Promise<{
  userId: string;
  workspaceId: string | null;
  scopes: string;
  tokenId: string;
} | null> {
  const trimmed = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!trimmed.startsWith(MCP_TOKEN_PREFIX) || trimmed.length < MIN_TOKEN_LENGTH) return null;
  const hash = hashMcpToken(trimmed);
  const token = await prisma.mcpAccessToken.findFirst({
    where: { tokenHash: hash, revokedAt: null },
  });
  if (!token) return null;
  await prisma.mcpAccessToken.update({
    where: { id: token.id },
    data: { lastUsedAt: new Date() },
  });
  return {
    userId: token.userId,
    workspaceId: token.workspaceId,
    scopes: token.scopes,
    tokenId: token.id,
  };
}

export async function listMcpTokensForUser(userId: string, workspaceId?: string | null) {
  const where: { userId: string; revokedAt: null; workspaceId?: string | null } = {
    userId,
    revokedAt: null,
  };
  if (workspaceId != null) {
    where.workspaceId = workspaceId;
  }
  return prisma.mcpAccessToken.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      label: true,
      tokenPrefix: true,
      scopes: true,
      workspaceId: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function revokeMcpToken(tokenId: string, userId: string) {
  const token = await prisma.mcpAccessToken.findFirst({
    where: { id: tokenId, userId },
  });
  if (!token) return false;
  await prisma.mcpAccessToken.update({
    where: { id: tokenId },
    data: { revokedAt: new Date() },
  });
  return true;
}
