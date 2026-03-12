import { prisma } from './db';
import { getProjectById } from './project';
import { ensureCanEditProject } from './workspace';

export async function listSlackWebhooks(projectId: string, userId: string) {
  const project = await getProjectById(projectId, userId);
  if (!project) return null;
  return prisma.slackWebhookConfig.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createSlackWebhook(
  projectId: string,
  userId: string,
  data: { url: string; enabled?: boolean }
) {
  const project = await getProjectById(projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  if (!data.url.startsWith('https://hooks.slack.com/')) {
    throw new Error('Invalid Slack webhook URL');
  }
  return prisma.slackWebhookConfig.create({
    data: {
      projectId,
      url: data.url,
      enabled: data.enabled ?? true,
    },
  });
}

export async function updateSlackWebhook(
  webhookId: string,
  userId: string,
  data: { url?: string; enabled?: boolean }
) {
  const webhook = await prisma.slackWebhookConfig.findFirst({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error('Not found');
  const project = await getProjectById(webhook.projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  if (data.url !== undefined && !data.url.startsWith('https://hooks.slack.com/')) {
    throw new Error('Invalid Slack webhook URL');
  }
  return prisma.slackWebhookConfig.update({
    where: { id: webhookId },
    data: { url: data.url ?? webhook.url, enabled: data.enabled ?? webhook.enabled },
  });
}

export async function deleteSlackWebhook(webhookId: string, userId: string) {
  const webhook = await prisma.slackWebhookConfig.findFirst({
    where: { id: webhookId },
  });
  if (!webhook) throw new Error('Not found');
  const project = await getProjectById(webhook.projectId, userId);
  if (!project) throw new Error('Not found');
  await ensureCanEditProject(project.workspaceId, userId);
  await prisma.slackWebhookConfig.delete({ where: { id: webhookId } });
}
