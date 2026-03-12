/**
 * Structured docs content for MCP tools. Used by search_docs, get_quickstart, etc.
 */

export const DOCS_SECTIONS = [
  {
    id: 'quickstart',
    title: 'Quickstart',
    summary: 'Get from zero to first events in a few minutes.',
    content: `1. Create an account and sign in.
2. Create a workspace and a project.
3. Copy the ingest API key (shown once).
4. Install the Node SDK and add your key to the environment.
5. Wrap your external API calls with the SDK; events appear in the dashboard.`,
    path: '/docs#quickstart',
  },
  {
    id: 'install',
    title: 'Install SDK',
    summary: 'Install the DependWatch Node SDK from npm.',
    content: `npm install @dependwatch/sdk-node

# or
yarn add @dependwatch/sdk-node`,
    path: '/docs#install',
  },
  {
    id: 'project-key',
    title: 'Create project & ingest key',
    summary: 'Create a project in the dashboard to get your ingest key.',
    content: `In the dashboard, create a workspace (if needed), then a project. When you create a project, we generate a default ingest key. You can create more keys in Project → Settings. Keep keys secret and use environment variables (e.g. DEPENDWATCH_INGEST_KEY).`,
    path: '/docs#project-key',
  },
  {
    id: 'openai',
    title: 'Instrument OpenAI',
    summary: 'Wrap OpenAI SDK calls with the DependWatch wrap() function.',
    content: `import { init, wrap } from '@dependwatch/sdk-node';
import OpenAI from 'openai';

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
  environment: 'prod',
});
const openai = new OpenAI();

const completion = await wrap(
  { provider: 'openai', endpoint: 'chat/completions' },
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
  })
);`,
    path: '/docs#openai',
  },
  {
    id: 'stripe',
    title: 'Instrument Stripe',
    summary: 'Wrap Stripe API calls with wrap().',
    content: `import { wrap } from '@dependwatch/sdk-node';

const customer = await wrap(
  { provider: 'stripe', endpoint: 'customers.create' },
  () => stripe.customers.create({ email })
);`,
    path: '/docs#stripe',
  },
  {
    id: 'resend',
    title: 'Instrument Resend (or generic fetch)',
    summary: 'Wrap any fetch-based API call.',
    content: `import { wrap } from '@dependwatch/sdk-node';

const data = await wrap(
  { provider: 'resend', endpoint: 'emails.send', method: 'POST' },
  () =>
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: '...', to: '...', subject: '...' }),
    }).then((r) => r.json())
);`,
    path: '/docs#generic',
  },
  {
    id: 'twilio',
    title: 'Instrument Twilio',
    summary: 'Wrap Twilio SDK or HTTP calls.',
    content: `import { wrap } from '@dependwatch/sdk-node';

const message = await wrap(
  { provider: 'twilio', endpoint: 'messages.create' },
  () => twilioClient.messages.create({ to, from, body })
);`,
    path: '/docs#twilio',
  },
  {
    id: 'anthropic',
    title: 'Instrument Anthropic (Claude)',
    summary: 'Wrap Anthropic SDK calls to monitor Claude API latency and cost.',
    content: `import { init, wrap } from '@dependwatch/sdk-node';
import Anthropic from '@anthropic-ai/sdk';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const anthropic = new Anthropic();

const message = await wrap(
  { provider: 'anthropic', endpoint: 'messages.create', estimated_cost_usd: 0.003 },
  () => anthropic.messages.create({ model: 'claude-3-5-sonnet-20241022', max_tokens: 1024, messages: [{ role: 'user', content: 'Hello' }] })
);`,
    path: '/docs#anthropic',
  },
  {
    id: 'clerk',
    title: 'Instrument Clerk',
    summary: 'Wrap Clerk backend API calls to monitor auth reliability.',
    content: `import { init, wrap } from '@dependwatch/sdk-node';
import { createClerkClient } from '@clerk/backend';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const user = await wrap(
  { provider: 'clerk', endpoint: 'users.getUser' },
  () => clerk.users.getUser(userId)
);`,
    path: '/docs#clerk',
  },
  {
    id: 'auth0',
    title: 'Instrument Auth0',
    summary: 'Wrap Auth0 Management or Authentication API calls.',
    content: `import { init, wrap } from '@dependwatch/sdk-node';
import { ManagementClient } from 'auth0';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const auth0 = new ManagementClient({ domain, clientId, clientSecret });

const users = await wrap(
  { provider: 'auth0', endpoint: 'users.list', method: 'GET' },
  () => auth0.users.getAll()
);`,
    path: '/docs#auth0',
  },
  {
    id: 'aws',
    title: 'Instrument AWS',
    summary: 'Wrap AWS SDK v3 calls (e.g. S3, DynamoDB, Bedrock).',
    content: `import { init, wrap } from '@dependwatch/sdk-node';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const s3 = new S3Client({ region: 'us-east-1' });

const result = await wrap(
  { provider: 'aws-s3', endpoint: 'GetObject', method: 'GET' },
  () => s3.send(new GetObjectCommand({ Bucket: 'my-bucket', Key: 'path/to/file.json' }))
);`,
    path: '/docs#aws',
  },
  {
    id: 'supabase',
    title: 'Instrument Supabase',
    summary: 'Wrap Supabase client calls for database, Auth, or Storage.',
    content: `import { init, wrap } from '@dependwatch/sdk-node';
import { createClient } from '@supabase/supabase-js';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const supabase = createClient(url, key);

const { data } = await wrap(
  { provider: 'supabase', endpoint: 'from.select', method: 'GET' },
  () => supabase.from('users').select('*').limit(10)
);`,
    path: '/docs#supabase',
  },
  {
    id: 'generic',
    title: 'Generic provider',
    summary: 'Use any provider name for custom or unsupported APIs.',
    content: `import { wrap } from '@dependwatch/sdk-node';

const result = await wrap(
  { provider: 'my-api', endpoint: 'users.list', method: 'GET' },
  () => fetch('https://api.example.com/users').then((r) => r.json())
);`,
    path: '/docs#generic',
  },
  {
    id: 'alerts',
    title: 'Alerts',
    summary: 'Configure latency, error rate, and budget alerts.',
    content: `In Project → Settings you can configure alert rules: latency threshold (ms), error rate (%), and monthly budget (USD). Alerts are delivered to Slack only: Free has 1 rule and no webhooks; Pro has up to 10 rules and 3 webhooks; Scale has unlimited. Add webhook URL in Project → Settings → Alerts. We apply a plan-dependent cooldown to avoid noisy alerts.`,
    path: '/docs#alerts',
  },
  {
    id: 'cost',
    title: 'Cost estimation',
    summary: 'How projected cost is calculated.',
    content: `We maintain default cost models for known providers (e.g. OpenAI per 1k tokens, Resend per email). You can override cost per call or per 1k units in project provider settings. The dashboard shows projected monthly cost by extrapolating from the selected period.`,
    path: '/docs#cost',
  },
];

export const SETUP_STEPS = [
  { step: 1, title: 'Create project', description: 'In the dashboard, create a workspace and a project.' },
  { step: 2, title: 'Get ingest key', description: 'Copy the ingest API key (shown once when you create the project or in Project → Settings).' },
  { step: 3, title: 'Install SDK', description: 'Run: npm install @dependwatch/sdk-node' },
  { step: 4, title: 'Init SDK', description: 'Call init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY }) at app startup.' },
  { step: 5, title: 'Wrap API calls', description: 'Wrap external API calls with wrap({ provider, endpoint }, async () => yourCall()).' },
  { step: 6, title: 'Verify in dashboard', description: 'Send a test event or use your app; events appear in the project dashboard.' },
];

export const API_REFERENCE_SUMMARY = `
Ingest key: Secret key that identifies your project. Pass it to init(). Never expose it in client-side code.
Init: init({ ingestKey, baseUrl?, environment?, flushIntervalMs?, maxBatchSize? }) — call once at startup.
Wrap: wrap({ provider, endpoint, method?, estimated_cost_usd? }, async () => result) — wraps an async call, records duration and success, sends an event to DependWatch.
Track: track({ provider, endpoint, duration_ms, success, status_code?, estimated_cost_usd? }) — manual event when you already measured the call.
Event fields: provider, endpoint, duration_ms, success, status_code, estimated_cost_usd (optional). Dashboard shows latency percentiles, error rate, volume, and projected cost per provider.
`.trim();

export const PROVIDER_EXAMPLES: Record<string, { code: string; explanation: string }> = {
  openai: {
    code: `import { init, wrap } from '@dependwatch/sdk-node';
import OpenAI from 'openai';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const openai = new OpenAI();

const completion = await wrap(
  { provider: 'openai', endpoint: 'chat/completions', estimated_cost_usd: 0.002 },
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello' }],
  })
);`,
    explanation: 'Wraps the OpenAI chat completion call. DependWatch records latency, success, and optional cost for dashboard metrics.',
  },
  stripe: {
    code: `import { wrap } from '@dependwatch/sdk-node';

const customer = await wrap(
  { provider: 'stripe', endpoint: 'customers.create' },
  () => stripe.customers.create({ email: 'user@example.com' })
);`,
    explanation: 'Wraps Stripe customer creation. Use the same pattern for payment_intents, subscriptions, etc.',
  },
  twilio: {
    code: `import { wrap } from '@dependwatch/sdk-node';

const message = await wrap(
  { provider: 'twilio', endpoint: 'messages.create', estimated_cost_usd: 0.0079 },
  () => twilioClient.messages.create({ to, from, body })
);`,
    explanation: 'Wraps Twilio message send. Estimated cost helps the dashboard project spend.',
  },
  resend: {
    code: `import { wrap } from '@dependwatch/sdk-node';

const data = await wrap(
  { provider: 'resend', endpoint: 'emails.send', method: 'POST' },
  () => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, body }),
  }).then((r) => r.json())
);`,
    explanation: 'Wraps Resend (or any HTTP) email send. Use provider name "resend" or a custom name.',
  },
  anthropic: {
    code: `import { init, wrap } from '@dependwatch/sdk-node';
import Anthropic from '@anthropic-ai/sdk';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const anthropic = new Anthropic();

const message = await wrap(
  { provider: 'anthropic', endpoint: 'messages.create', estimated_cost_usd: 0.003 },
  () => anthropic.messages.create({ model: 'claude-3-5-sonnet-20241022', max_tokens: 1024, messages: [{ role: 'user', content: 'Hello' }] })
);`,
    explanation: 'Wraps Anthropic Claude API call. DependWatch records latency, success, and cost.',
  },
  clerk: {
    code: `import { init, wrap } from '@dependwatch/sdk-node';
import { createClerkClient } from '@clerk/backend';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const user = await wrap(
  { provider: 'clerk', endpoint: 'users.getUser' },
  () => clerk.users.getUser(userId)
);`,
    explanation: 'Wraps Clerk backend API call. Monitor auth reliability and failures.',
  },
  auth0: {
    code: `import { init, wrap } from '@dependwatch/sdk-node';
import { ManagementClient } from 'auth0';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const auth0 = new ManagementClient({ domain, clientId, clientSecret });

const users = await wrap(
  { provider: 'auth0', endpoint: 'users.list', method: 'GET' },
  () => auth0.users.getAll()
);`,
    explanation: 'Wraps Auth0 API call. Track login and Management API latency and errors.',
  },
  aws: {
    code: `import { init, wrap } from '@dependwatch/sdk-node';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const s3 = new S3Client({ region: 'us-east-1' });

const result = await wrap(
  { provider: 'aws-s3', endpoint: 'GetObject', method: 'GET' },
  () => s3.send(new GetObjectCommand({ Bucket: 'my-bucket', Key: 'key' }))
);`,
    explanation: 'Wraps AWS SDK call. Use provider names like aws-s3, aws-dynamodb, aws-bedrock.',
  },
  supabase: {
    code: `import { init, wrap } from '@dependwatch/sdk-node';
import { createClient } from '@supabase/supabase-js';

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const supabase = createClient(url, key);

const { data } = await wrap(
  { provider: 'supabase', endpoint: 'from.select', method: 'GET' },
  () => supabase.from('users').select('*').limit(10)
);`,
    explanation: 'Wraps Supabase client call for database, Auth, or Storage.',
  },
  generic: {
    code: `import { wrap } from '@dependwatch/sdk-node';

const result = await wrap(
  { provider: 'my-service', endpoint: 'users.list', method: 'GET' },
  () => fetch('https://api.example.com/users').then((r) => r.json())
);`,
    explanation: 'Use any provider and endpoint name for custom or third-party APIs. We still record latency and success.',
  },
};

const SEARCH_ALIASES: Record<string, string[]> = {
  openai: ['openai', 'open ai', 'gpt', 'chat completions'],
  anthropic: ['anthropic', 'claude', 'claude api'],
  stripe: ['stripe', 'payments', 'customer'],
  install: ['install', 'sdk', 'npm', 'setup'],
  quickstart: ['quickstart', 'quick start', 'getting started'],
  resend: ['resend', 'email', 'sendgrid'],
  twilio: ['twilio', 'sms', 'messages'],
  clerk: ['clerk', 'auth', 'authentication', 'identity'],
  auth0: ['auth0', 'auth zero', 'authentication'],
  supabase: ['supabase', 'supabase auth', 'database'],
  aws: ['aws', 'amazon', 's3', 'dynamodb', 'bedrock'],
};

export function searchDocsContent(query: string): typeof DOCS_SECTIONS {
  const q = query.toLowerCase().trim();
  if (!q) return DOCS_SECTIONS.slice(0, 5);
  const terms = q.split(/\s+/).filter(Boolean);
  const expandedTerms = new Set<string>(terms);
  for (const term of terms) {
    for (const [key, aliases] of Object.entries(SEARCH_ALIASES)) {
      if (aliases.some((a) => a.includes(term) || term.includes(key))) expandedTerms.add(key);
    }
  }
  const scored = DOCS_SECTIONS.map((section) => {
    const searchable = `${section.title} ${section.summary} ${section.content} ${section.id}`.toLowerCase();
    let score = 0;
    for (const term of expandedTerms) {
      if (searchable.includes(term)) score += 1;
      if (section.title.toLowerCase().includes(term)) score += 2;
      if (section.id === term || section.id.includes(term)) score += 2;
    }
    return { section, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).map((s) => s.section).slice(0, 8);
}

const PROVIDER_ALIASES: Record<string, string> = {
  openai: 'openai',
  'open ai': 'openai',
  'open-ai': 'openai',
  anthropic: 'anthropic',
  claude: 'anthropic',
  stripe: 'stripe',
  twilio: 'twilio',
  resend: 'resend',
  email: 'resend',
  sendgrid: 'resend',
  clerk: 'clerk',
  auth0: 'auth0',
  'auth zero': 'auth0',
  supabase: 'supabase',
  aws: 'aws',
  amazon: 'aws',
  generic: 'generic',
  rest: 'generic',
  fetch: 'generic',
  http: 'generic',
};

export function getProviderExample(providerName: string): { code: string; explanation: string } | null {
  const normalized = providerName.toLowerCase().trim().replace(/\s+/g, ' ');
  const key = PROVIDER_ALIASES[normalized] ?? normalized.replace(/\s+/g, '');
  return PROVIDER_EXAMPLES[key] ?? PROVIDER_EXAMPLES.generic ?? null;
}
