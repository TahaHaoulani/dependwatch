/**
 * ApiIncident workflow: create from guardrail, acknowledge, resolve, add note.
 * Used by dashboard and API routes.
 */

import { prisma } from '@/lib/db';
import { getProjectById } from '@/lib/project';
import { ensureCanEditProject } from '@/lib/workspace';
import type { GuardrailAlert } from '@/lib/analytics';

export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

function guardrailToType(g: GuardrailAlert): string {
  if (g.type === 'cost_spike') return 'cost_spike';
  if (g.type === 'error_spike') return 'error_spike';
  if (g.type === 'latency_spike') return 'latency_spike';
  return 'traffic_anomaly';
}

function guardrailToMessage(g: GuardrailAlert): string {
  switch (g.type) {
    case 'cost_spike':
      return `${g.provider} cost spike: +${Math.round((g.increase - 1) * 100)}% vs baseline`;
    case 'error_spike':
      return `${g.provider}${g.endpoint ? `.${g.endpoint}` : ''} error rate ${(g.errorRate * 100).toFixed(2)}%`;
    case 'latency_spike':
      return `${g.provider}.${g.endpoint} P95 latency ${(g.p95Ms / 1000).toFixed(1)}s`;
    case 'traffic_anomaly':
      return `${g.provider}${g.endpoint ? `.${g.endpoint}` : ''} traffic ${(g.currentCalls / g.baselineCalls).toFixed(1)}× baseline`;
    default:
      return 'Incident detected';
  }
}

export async function createIncidentFromGuardrail(
  projectId: string,
  userId: string,
  guardrail: GuardrailAlert
) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);

  const endpoint = 'endpoint' in guardrail && guardrail.endpoint != null ? guardrail.endpoint : null;
  return prisma.apiIncident.create({
    data: {
      projectId,
      provider: guardrail.provider,
      endpoint,
      type: guardrailToType(guardrail),
      message: guardrailToMessage(guardrail),
      status: 'open',
    },
  });
}

export async function listIncidents(
  projectId: string,
  userId: string,
  options?: { status?: IncidentStatus }
) {
  const project = await getProjectById(projectId, userId);
  if (!project) return null;
  const where: { projectId: string; status?: string } = { projectId };
  if (options?.status) where.status = options.status;
  return prisma.apiIncident.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateIncident(
  incidentId: string,
  userId: string,
  data: { status?: IncidentStatus; note?: string; assignedToId?: string | null }
) {
  const incident = await prisma.apiIncident.findFirst({ where: { id: incidentId }, include: { project: true } });
  if (!incident) throw new Error('Not found');
  const project = await getProjectById(incident.projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(incident.project.workspaceId, userId);

  const update: { status?: string; note?: string; assignedToId?: string | null; resolvedAt?: Date | null } = {};
  if (data.status !== undefined) {
    update.status = data.status;
    if (data.status === 'resolved') update.resolvedAt = new Date();
    else if (incident.status === 'resolved') update.resolvedAt = null;
  }
  if (data.note !== undefined) update.note = data.note;
  if (data.assignedToId !== undefined) update.assignedToId = data.assignedToId;

  return prisma.apiIncident.update({
    where: { id: incidentId },
    data: update,
  });
}

export async function getIncidentById(incidentId: string, userId: string) {
  const incident = await prisma.apiIncident.findFirst({
    where: { id: incidentId },
    include: { project: true },
  });
  if (!incident) return null;
  const project = await getProjectById(incident.projectId, userId);
  return project ? incident : null;
}
