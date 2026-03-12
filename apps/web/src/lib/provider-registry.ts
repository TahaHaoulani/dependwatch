/**
 * Central provider taxonomy for DependWatch.
 * Used by: docs nav, landing ecosystem bar, provider icons, MCP docs, dashboard empty state.
 * Keeps provider categories and naming consistent across product and SEO.
 */

export type ProviderCategoryId =
  | 'ai'
  | 'payments'
  | 'messaging'
  | 'auth'
  | 'cloud'
  | 'search-data'
  | 'maps'
  | 'dev-platform'
  | 'generic';

export interface ProviderItem {
  id: string;
  label: string;
  /** Optional: doc section anchor (e.g. openai, clerk). Omit if no dedicated doc page. */
  docId?: string;
}

export interface ProviderCategory {
  id: ProviderCategoryId;
  label: string;
  /** Short label for nav (e.g. "Auth / Identity") */
  navLabel: string;
  providers: ProviderItem[];
}

/**
 * Category order is strategic: AI (highest volume), then Auth & Identity (high impact/SEO),
 * then Payments, Messaging, Cloud, Search, Maps, Dev, Generic.
 * navLabel is used in docs sidebar — keep short and scannable.
 */
export const PROVIDER_CATEGORIES: ProviderCategory[] = [
  {
    id: 'ai',
    label: 'AI APIs',
    navLabel: 'AI APIs',
    providers: [
      { id: 'openai', label: 'OpenAI', docId: 'openai' },
      { id: 'anthropic', label: 'Anthropic', docId: 'anthropic' },
      { id: 'mistral', label: 'Mistral', docId: 'mistral' },
      { id: 'google-gemini', label: 'Google Gemini', docId: 'google-gemini' },
      { id: 'cohere', label: 'Cohere' },
      { id: 'replicate', label: 'Replicate' },
      { id: 'together', label: 'Together AI' },
    ],
  },
  {
    id: 'auth',
    label: 'Auth & Identity',
    navLabel: 'Auth & Identity',
    providers: [
      { id: 'clerk', label: 'Clerk', docId: 'clerk' },
      { id: 'auth0', label: 'Auth0', docId: 'auth0' },
      { id: 'supabase-auth', label: 'Supabase Auth', docId: 'supabase' },
      { id: 'firebase-auth', label: 'Firebase Auth' },
      { id: 'cognito', label: 'AWS Cognito' },
      { id: 'okta', label: 'Okta' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments',
    navLabel: 'Payments',
    providers: [
      { id: 'stripe', label: 'Stripe', docId: 'stripe' },
      { id: 'paypal', label: 'PayPal' },
      { id: 'adyen', label: 'Adyen' },
      { id: 'checkout', label: 'Checkout.com' },
    ],
  },
  {
    id: 'messaging',
    label: 'Messaging & Notifications',
    navLabel: 'Messaging',
    providers: [
      { id: 'twilio', label: 'Twilio', docId: 'twilio' },
      { id: 'resend', label: 'Resend' },
      { id: 'sendgrid', label: 'SendGrid' },
      { id: 'mailgun', label: 'Mailgun' },
      { id: 'vonage', label: 'Vonage' },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud & Infrastructure',
    navLabel: 'Cloud',
    providers: [
      { id: 'aws', label: 'AWS', docId: 'aws' },
      { id: 'google-cloud', label: 'Google Cloud' },
      { id: 'azure', label: 'Azure' },
      { id: 'cloudflare', label: 'Cloudflare' },
      { id: 'supabase', label: 'Supabase', docId: 'supabase' },
      { id: 'firebase', label: 'Firebase' },
    ],
  },
  {
    id: 'search-data',
    label: 'Search & Data',
    navLabel: 'Search & Data',
    providers: [
      { id: 'algolia', label: 'Algolia' },
      { id: 'pinecone', label: 'Pinecone' },
      { id: 'weaviate', label: 'Weaviate' },
      { id: 'elasticsearch', label: 'Elasticsearch' },
    ],
  },
  {
    id: 'maps',
    label: 'Maps & Location',
    navLabel: 'Maps',
    providers: [
      { id: 'google-maps', label: 'Google Maps' },
      { id: 'mapbox', label: 'Mapbox' },
      { id: 'here', label: 'HERE' },
    ],
  },
  {
    id: 'dev-platform',
    label: 'Dev & Platform',
    navLabel: 'Dev & Platform',
    providers: [
      { id: 'github', label: 'GitHub' },
      { id: 'gitlab', label: 'GitLab' },
      { id: 'vercel', label: 'Vercel' },
      { id: 'cloudflare-api', label: 'Cloudflare API' },
    ],
  },
  {
    id: 'generic',
    label: 'Generic',
    navLabel: 'Generic',
    providers: [{ id: 'generic', label: 'Generic HTTP / fetch', docId: 'generic' }],
  },
];

/** All provider doc anchors that have a dedicated doc section (for nav links). */
export const PROVIDER_DOC_IDS = new Set(
  PROVIDER_CATEGORIES.flatMap((cat) => cat.providers.map((p) => p.docId).filter(Boolean))
) as Set<string>;

/** Flattened list of all provider ids (lowercase) for icon domain fallback. */
export const ALL_PROVIDER_IDS = PROVIDER_CATEGORIES.flatMap((c) =>
  c.providers.map((p) => p.id.toLowerCase())
);

/** Provider slug -> logo.dev domain. Used by ProviderIcon and ApiEcosystemBar. */
export const PROVIDER_DOMAINS: Record<string, string> = {
  openai: 'openai.com',
  anthropic: 'anthropic.com',
  mistral: 'mistral.ai',
  'google-gemini': 'google.com',
  cohere: 'cohere.com',
  replicate: 'replicate.com',
  together: 'together.ai',
  stripe: 'stripe.com',
  paypal: 'paypal.com',
  adyen: 'adyen.com',
  checkout: 'checkout.com',
  twilio: 'twilio.com',
  resend: 'resend.com',
  sendgrid: 'sendgrid.com',
  mailgun: 'mailgun.com',
  vonage: 'vonage.com',
  clerk: 'clerk.com',
  auth0: 'auth0.com',
  'supabase-auth': 'supabase.com',
  supabase: 'supabase.com',
  'firebase-auth': 'firebase.google.com',
  firebase: 'firebase.google.com',
  cognito: 'aws.amazon.com',
  okta: 'okta.com',
  aws: 'aws.amazon.com',
  'google-cloud': 'google.com',
  azure: 'microsoft.com',
  cloudflare: 'cloudflare.com',
  algolia: 'algolia.com',
  pinecone: 'pinecone.io',
  weaviate: 'weaviate.io',
  elasticsearch: 'elastic.co',
  'google-maps': 'google.com',
  mapbox: 'mapbox.com',
  here: 'here.com',
  github: 'github.com',
  gitlab: 'gitlab.com',
  vercel: 'vercel.com',
  'cloudflare-api': 'cloudflare.com',
  generic: 'generic',
  // Legacy / additional slugs seen in events or landing
  postgresql: 'postgresql.org',
  mongodb: 'mongodb.com',
  redis: 'redis.io',
  huggingface: 'huggingface.co',
  groq: 'groq.com',
  microsoft: 'microsoft.com',
};

/** Resolve provider id/slug to logo domain (for ProviderIcon). */
export function getProviderDomain(providerId: string): string {
  const key = providerId.toLowerCase().replace(/\s+/g, '-');
  if (PROVIDER_DOMAINS[key]) return PROVIDER_DOMAINS[key];
  // Compound names (e.g. aws-s3, google-gemini) — use first segment for logo
  if (key.startsWith('aws-')) return 'aws.amazon.com';
  if (key.startsWith('google-')) return 'google.com';
  return `${key.replace(/-/g, '')}.com`;
}
