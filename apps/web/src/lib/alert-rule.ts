import { prisma } from './db';
import { getProjectById } from './project';
import { ensureCanEditProject } from './workspace';
import { Decimal } from '@prisma/client/runtime/library';

export type AlertRuleType = 'latency' | 'error_rate' | 'budget' | 'traffic';

export async function listAlertRules(projectId: string, userId: string) {
  const project = await getProjectById(projectId, userId);
  if (!project) return null;
  return prisma.alertRule.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAlertRule(
  projectId: string,
  userId: string,
  data: {
    name: string;
    enabled?: boolean;
    latencyThresholdMs?: number | null;
    errorRateThresholdPercent?: number | null;
    monthlyBudgetUsd?: number | null;
    cooldownMinutes?: number;
  }
) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  return prisma.alertRule.create({
    data: {
      projectId,
      name: data.name.slice(0, 120),
      enabled: data.enabled ?? true,
      latencyThresholdMs: data.latencyThresholdMs ?? null,
      errorRateThresholdPercent: data.errorRateThresholdPercent != null ? new Decimal(data.errorRateThresholdPercent) : null,
      monthlyBudgetUsd: data.monthlyBudgetUsd != null ? new Decimal(data.monthlyBudgetUsd) : null,
      cooldownMinutes: data.cooldownMinutes ?? 60,
    },
  });
}

export async function updateAlertRule(
  ruleId: string,
  userId: string,
  data: {
    name?: string;
    enabled?: boolean;
    latencyThresholdMs?: number | null;
    errorRateThresholdPercent?: number | null;
    monthlyBudgetUsd?: number | null;
    cooldownMinutes?: number;
  }
) {
  const rule = await prisma.alertRule.findFirst({
    where: { id: ruleId },
    include: { project: true },
  });
  if (!rule) throw new Error('Not found');
  await getProjectById(rule.projectId, userId);
  await ensureCanEditProject(rule.project.workspaceId, userId);
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name.slice(0, 120);
  if (data.enabled !== undefined) update.enabled = data.enabled;
  if (data.latencyThresholdMs !== undefined) update.latencyThresholdMs = data.latencyThresholdMs;
  if (data.errorRateThresholdPercent !== undefined) update.errorRateThresholdPercent = data.errorRateThresholdPercent != null ? new Decimal(data.errorRateThresholdPercent) : null;
  if (data.monthlyBudgetUsd !== undefined) update.monthlyBudgetUsd = data.monthlyBudgetUsd != null ? new Decimal(data.monthlyBudgetUsd) : null;
  if (data.cooldownMinutes !== undefined) update.cooldownMinutes = data.cooldownMinutes;
  return prisma.alertRule.update({
    where: { id: ruleId },
    data: update,
  });
}

export async function deleteAlertRule(ruleId: string, userId: string) {
  const rule = await prisma.alertRule.findFirst({
    where: { id: ruleId },
    include: { project: true },
  });
  if (!rule) throw new Error('Not found');
  await getProjectById(rule.projectId, userId);
  await ensureCanEditProject(rule.project.workspaceId, userId);
  await prisma.alertRule.delete({ where: { id: ruleId } });
}
