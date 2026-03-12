'use client';

import { PROVIDER_CATEGORIES } from '@/lib/provider-registry';

/** Build nav groups: static sections + provider categories (only providers with doc sections). */
function buildDocsNav() {
  const providerGroups = PROVIDER_CATEGORIES.map((cat) => ({
    group: cat.navLabel,
    items: cat.providers.filter((p) => p.docId).map((p) => ({ id: p.docId!, label: p.label })),
  })).filter((g) => g.items.length > 0);

  return [
    {
      group: 'Getting Started',
      items: [
        { id: 'quickstart', label: 'Quickstart' },
        { id: 'install', label: 'Installation' },
        { id: 'project-key', label: 'Create Project & API Key' },
        { id: 'send-first-event', label: 'Send Your First Event' },
      ],
    },
    {
      group: 'SDK',
      items: [
        { id: 'sdk-overview', label: 'SDK Overview' },
        { id: 'initialize-sdk', label: 'Initialize SDK' },
        { id: 'wrapping-api-calls', label: 'Wrapping API Calls' },
        { id: 'providers', label: 'Providers' },
      ],
    },
    { group: 'By provider', items: [] },
    ...providerGroups,
    {
      group: 'Observability',
      items: [
        { id: 'dashboard-metrics', label: 'Dashboard Overview' },
        { id: 'latency-tracking', label: 'Latency Tracking' },
        { id: 'error-tracking', label: 'Error Tracking' },
        { id: 'cost', label: 'Cost Estimation' },
        { id: 'provider-breakdown', label: 'Provider Breakdown' },
        { id: 'operations', label: 'Operation-Level Analytics' },
        { id: 'event-stream', label: 'Event Stream & Recent Failures' },
      ],
    },
    {
      group: 'API Intelligence & Guardrails',
      items: [
        { id: 'insights', label: 'API Intelligence (Insights)' },
        { id: 'guardrails', label: 'Guardrails' },
      ],
    },
    {
      group: 'Dependency Graph',
      items: [
        { id: 'dependency-graph', label: 'Dependency Map' },
        { id: 'reliability-map', label: 'Reliability & Cost per Provider' },
      ],
    },
    {
      group: 'Protection',
      items: [
        { id: 'control-protection', label: 'Control & Protection (Foundation)' },
        { id: 'retry-fallback', label: 'Retry & Fallback Patterns' },
      ],
    },
    {
      group: 'Alerts',
      items: [
        { id: 'alerts', label: 'Latency Alerts' },
        { id: 'error-alerts', label: 'Error Alerts' },
        { id: 'cost-spike-alerts', label: 'Cost Spike Alerts' },
      ],
    },
    {
      group: 'API',
      items: [
        { id: 'ingest-api', label: 'Ingest API' },
        { id: 'event-schema', label: 'Event Schema' },
      ],
    },
    {
      group: 'Security',
      items: [
        { id: 'api-keys', label: 'API Keys' },
        { id: 'key-rotation', label: 'Key Rotation' },
        { id: 'environment-variables', label: 'Environment Variables' },
      ],
    },
    {
      group: 'AI Integration',
      items: [
        { id: 'mcp-integration', label: 'MCP Integration' },
        { id: 'llm-providers', label: 'LLM providers (OpenAI, Gemini, Mistral, xAI, …)' },
        { id: 'cursor', label: 'Using DependWatch in Cursor' },
        { id: 'claude-code', label: 'Using DependWatch in Claude Code' },
      ],
    },
    {
      group: 'Concepts',
      items: [
        { id: 'events', label: 'Events' },
        { id: 'providers-concept', label: 'Providers' },
        { id: 'cost-estimation-concept', label: 'Cost Estimation' },
        { id: 'project-workspace', label: 'Project & Workspace Model' },
      ],
    },
    {
      group: 'Reference',
      items: [
        { id: 'sdk-api-reference', label: 'SDK API Reference' },
        { id: 'env-vars-ref', label: 'Environment Variables' },
        { id: 'limits', label: 'Limits' },
      ],
    },
  ];
}

const DOCS_NAV = buildDocsNav();

export function DocsNav() {
  return (
    <nav
      className="sticky top-24 max-h-[calc(100vh-6rem)] w-[240px] shrink-0 overflow-y-auto space-y-8 pr-2"
      aria-label="Documentation"
    >
      {DOCS_NAV.map(({ group, items }) => (
        <div key={group}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/90">
            {group}
          </p>
          <ul className="space-y-0.5">
            {items.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-r-md border-l-2 border-transparent py-2 pl-3 pr-2 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted/30 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 focus:ring-offset-background"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
