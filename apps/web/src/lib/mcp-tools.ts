/**
 * MCP tool definitions and execution. Used by the /api/mcp JSON-RPC handler.
 */

import {
  DOCS_SECTIONS,
  SETUP_STEPS,
  API_REFERENCE_SUMMARY,
  searchDocsContent,
  getProviderExample,
  PROVIDER_EXAMPLES,
} from './mcp-docs-content';
import { hasScope } from './mcp-token';
import { getWorkspacesForUser } from './workspace';
import { getProjectsForWorkspace, getProjectById } from './project';
import { getProjectStats, getProjectStatsByProvider } from './analytics';
import { getPlanLimits } from './stripe';
import type { PlanId } from './stripe';
import { prisma } from './db';
import { ingestEventsForProject, getSampleTestEvents } from './ingest-service';
import { cacheGetOrSet, cacheKey } from './cache';

const PUBLIC_TOOLS = [
  'search_docs',
  'get_quickstart',
  'get_sdk_install',
  'get_provider_example',
  'get_setup_steps',
  'get_api_reference_summary',
] as const;

const AUTH_TOOLS = [
  'list_workspaces',
  'list_projects',
  'get_project_setup_status',
  'send_test_event',
  'get_project_overview',
  'get_latest_provider_metrics',
] as const;

export const MCP_TOOL_DEFINITIONS = [
  // Public
  {
    name: 'search_docs',
    description: 'Search DependWatch documentation. Returns matching sections with titles, summaries, and content.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (e.g. "OpenAI integration", "install SDK")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_quickstart',
    description: 'Get high-level quickstart instructions for getting started with DependWatch.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_sdk_install',
    description: 'Get install commands for the DependWatch Node SDK and a brief explanation.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_provider_example',
    description: 'Get a concise code example for a specific provider (e.g. openai, stripe, twilio, resend, generic).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        provider: { type: 'string', description: 'Provider name: openai, stripe, twilio, resend, or generic' },
      },
      required: ['provider'],
    },
  },
  {
    name: 'get_setup_steps',
    description: 'Get a concise list of onboarding/setup steps: create project, get key, install SDK, init, wrap calls, verify in dashboard.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_api_reference_summary',
    description: 'Get a concise summary of ingest key, init, wrap, track, event fields, and dashboard behavior.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  // Authenticated
  {
    name: 'list_workspaces',
    description: 'List workspaces available to the current MCP token. Requires authentication.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_projects',
    description: 'List projects the user can access, optionally filtered by workspaceId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        workspaceId: { type: 'string', description: 'Optional workspace ID to filter projects' },
      },
    },
  },
  {
    name: 'get_project_setup_status',
    description: 'Get whether the project has an ingest key, has received events, and suggested next action.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'send_test_event',
    description: 'Create sample test events for the project so the dashboard shows data. Requires projects:test-event scope.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_project_overview',
    description: 'Get summary metrics for a project: event presence, key status, provider activity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'get_latest_provider_metrics',
    description: 'Get recent provider-level metrics: provider, calls, p95 latency, errors, projected cost.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        projectId: { type: 'string', description: 'Project ID' },
      },
      required: ['projectId'],
    },
  },
];

type McpContext = {
  userId: string;
  workspaceId: string | null;
  scopes: string;
};

export async function executeMcpTool(
  name: string,
  args: Record<string, unknown>,
  context: McpContext | null
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });

  // Public tools (no auth)
  if (name === 'search_docs') {
    const query = typeof args.query === 'string' ? args.query : '';
    const sections = searchDocsContent(query);
    const output = sections.length
      ? sections
          .map((s, i) => {
            const lang = s.content.startsWith('import ') || s.content.includes('await ') ? 'typescript' : s.content.startsWith('npm ') ? 'bash' : 'text';
            return `### ${s.title}\n\n${s.summary}\n\n**Docs:** \`${s.path}\`\n\n\`\`\`${lang}\n${s.content.trim()}\n\`\`\``;
          })
          .join('\n\n---\n\n')
      : 'No matching docs found. Try "quickstart", "OpenAI", "install", or "Stripe".';
    return text(output);
  }

  if (name === 'get_quickstart') {
    const quick = DOCS_SECTIONS.find((s) => s.id === 'quickstart');
    return text(
      quick
        ? `## DependWatch Quickstart\n\n${quick.content}\n\n**Full docs:** \`${quick.path}\``
        : 'Create account → Create workspace & project → Copy ingest key → Install SDK → Wrap API calls → See events in dashboard.'
    );
  }

  if (name === 'get_sdk_install') {
    const install = DOCS_SECTIONS.find((s) => s.id === 'install');
    const initCode = 'init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY })';
    return text(
      install
        ? `## Install DependWatch Node SDK\n\nPackage: \`@dependwatch/sdk-node\`\n\n\`\`\`bash\n${install.content}\n\`\`\`\n\nThen in your code: \`${initCode}\` at startup.`
        : `npm install @dependwatch/sdk-node — then ${initCode} at startup.`
    );
  }

  if (name === 'get_provider_example') {
    const provider = typeof args.provider === 'string' ? args.provider : 'generic';
    const example = getProviderExample(provider) ?? PROVIDER_EXAMPLES.generic!;
    return text(`## DependWatch: ${provider} example\n\n\`\`\`typescript\n${example.code.trim()}\n\`\`\`\n\n${example.explanation}`);
  }

  if (name === 'get_setup_steps') {
    const steps = SETUP_STEPS.map(
      (s) => `${s.step}. **${s.title}** — ${s.description}`
    ).join('\n');
    return text(`## DependWatch setup steps\n\n${steps}`);
  }

  if (name === 'get_api_reference_summary') {
    return text(`## DependWatch API reference\n\n${API_REFERENCE_SUMMARY}`);
  }

  // Authenticated tools
  if (!context) {
    return text('Error: This tool requires authentication. Add a DependWatch access token in your Cursor or Claude Code MCP config (Connect your coding assistant in the dashboard).');
  }

  if (name === 'list_workspaces') {
    if (!hasScope(context.scopes, 'projects:read')) {
      return text('Error: This token does not have projects:read scope.');
    }
    const workspaces = await getWorkspacesForUser(context.userId);
    const list = workspaces
      .map((w) => `- ${w.name} (id: ${w.id}, slug: ${w.slug}, projects: ${(w as { _count?: { projects: number } })._count?.projects ?? 0})`)
      .join('\n');
    return text(list ? `## DependWatch workspaces\n\n${list}` : 'No workspaces found.');
  }

  if (name === 'list_projects') {
    if (!hasScope(context.scopes, 'projects:read')) {
      return text('Error: This token does not have projects:read scope.');
    }
    const workspaceId = typeof args.workspaceId === 'string' ? args.workspaceId : null;
    if (workspaceId) {
      const projects = await getProjectsForWorkspace(workspaceId, context.userId);
      const list = projects.map((p) => `- ${p.name} (id: ${p.id}, slug: ${p.slug})`).join('\n');
      return text(list ? `## DependWatch projects\n\n${list}` : 'No projects in this workspace.');
    }
    const workspaces = await getWorkspacesForUser(context.userId);
    const lines: string[] = [];
    for (const w of workspaces) {
      const projects = await getProjectsForWorkspace(w.id, context.userId);
      for (const p of projects) {
        lines.push(`- ${p.name} (id: ${p.id}, workspace: ${w.name})`);
      }
    }
    return text(lines.length ? `## DependWatch projects (all workspaces)\n\n${lines.join('\n')}` : 'No projects found.');
  }

  const projectId = typeof args.projectId === 'string' ? args.projectId : '';
  if (!projectId) {
    return text('Error: projectId is required.');
  }

  const project = await getProjectById(projectId, context.userId);
  if (!project) {
    return text('Error: Project not found or access denied.');
  }

  if (context.workspaceId && project.workspaceId !== context.workspaceId) {
    return text('Error: Project is not in the workspace scoped to this token.');
  }

  if (name === 'get_project_setup_status') {
    if (!hasScope(context.scopes, 'projects:read')) {
      return text('Error: This token does not have projects:read scope.');
    }
    const hasKey = ((project as { apiKeys?: unknown[] }).apiKeys?.length ?? 0) > 0;
    const eventCount = await prisma.apiCallEvent.count({
      where: { projectId },
    });
    const hasEvents = eventCount > 0;
    let nextAction = 'Install the SDK and wrap your first API call.';
    if (!hasKey) nextAction = 'Create an ingest key in Project → Settings.';
    else if (!hasEvents) nextAction = 'Send events from your app or use "Send test event" to see data.';
    return text(
      `## DependWatch: ${project.name}\n\n` +
        `- **Ingest key:** ${hasKey ? 'Yes' : 'No'}\n` +
        `- **Events received:** ${hasEvents ? `Yes (${eventCount} events)` : 'No'}\n` +
        `- **Dashboard:** ${hasEvents ? 'Active' : 'Empty'}\n\n` +
        `**Next step:** ${nextAction}`
    );
  }

  if (name === 'send_test_event') {
    if (!hasScope(context.scopes, 'projects:test-event')) {
      return text('Error: This token does not have projects:test-event scope.');
    }
    const { getWorkspaceSubscription } = await import('@/lib/subscription');
    const subscription = await getWorkspaceSubscription(project.workspaceId);
    const planId = (subscription.planId ?? 'free') as PlanId;
    const limits = getPlanLimits(planId);
    const events = getSampleTestEvents(new Date(), { maxProviders: limits.maxProviders });
    const { count } = await ingestEventsForProject(projectId, events, { source: 'mcp' });
    return text(`Success. Created ${count} test events. Refresh the project dashboard to see them.`);
  }

  if (name === 'get_project_overview') {
    if (!hasScope(context.scopes, 'metrics:read')) {
      return text('Error: This token does not have metrics:read scope.');
    }
    const key = cacheKey(['mcp', 'overview', projectId]);
    const content = await cacheGetOrSet(
      key,
      async () => {
        const stats = await getProjectStats(projectId, '7d');
        const byProvider = await getProjectStatsByProvider(projectId, '7d');
        const providerSummary = byProvider
          .map((p) => `- ${p.provider}: ${p.calls} calls, ${p.errors} errors, p95 ${p.p95Ms ?? '—'}ms`)
          .join('\n');
        return (
          `## DependWatch: ${project.name} (7d)\n\n` +
          `- **Total calls:** ${stats.totalCalls}\n` +
          `- **Error rate:** ${(stats.errorRate * 100).toFixed(2)}%\n` +
          `- **Avg latency:** ${stats.avgLatencyMs ?? '—'}ms\n` +
          `- **Projected cost:** $${stats.costUsd.toFixed(4)}\n\n` +
          `### By provider\n${providerSummary || 'No data yet.'}`
        );
      },
      { ttlSeconds: 60, parseJson: false }
    );
    return text(content);
  }

  if (name === 'get_latest_provider_metrics') {
    if (!hasScope(context.scopes, 'metrics:read')) {
      return text('Error: This token does not have metrics:read scope.');
    }
    const key = cacheKey(['mcp', 'metrics', projectId]);
    const content = await cacheGetOrSet(
      key,
      async () => {
        const byProvider = await getProjectStatsByProvider(projectId, '7d');
        const rows = byProvider.map(
          (p) =>
            `${p.provider}: calls=${p.calls}, errors=${p.errors}, p95=${p.p95Ms ?? '—'}ms, cost=$${p.costUsd.toFixed(4)}`
        );
        return rows.length ? `## DependWatch provider metrics (7d)\n\n${rows.join('\n')}` : 'No provider metrics yet. Send events first.';
      },
      { ttlSeconds: 60, parseJson: false }
    );
    return text(content);
  }

  return text(`Unknown tool: ${name}`);
}
