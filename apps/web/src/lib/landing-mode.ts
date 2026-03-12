/**
 * Landing page mode: product (full signup/dashboard) vs waitlist (early access signup).
 * Toggle via NEXT_PUBLIC_LANDING_MODE=product|waitlist (default: product).
 * Use getLandingCopy() for mode-aware copy and CTAs; keep conditionals out of the page.
 */

export const LANDING_MODE = {
  product: 'product',
  waitlist: 'waitlist',
} as const;

export type LandingMode = (typeof LANDING_MODE)[keyof typeof LANDING_MODE];

const VALID_MODES: LandingMode[] = [LANDING_MODE.product, LANDING_MODE.waitlist];

function parseMode(): LandingMode {
  const raw = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_LANDING_MODE : undefined;
  const v = (raw ?? 'product').toLowerCase().trim();
  if (VALID_MODES.includes(v as LandingMode)) return v as LandingMode;
  return LANDING_MODE.product;
}

let _mode: LandingMode | null = null;

/** Server or client: current landing mode. Defaults to product. */
export function getLandingMode(): LandingMode {
  if (_mode === null) _mode = parseMode();
  return _mode;
}

export function isWaitlistMode(): boolean {
  return getLandingMode() === LANDING_MODE.waitlist;
}

/** Centralized copy and CTA labels by mode. Use these everywhere on the landing page. */
export type LandingCopy = {
  // Hero
  heroEyebrow: string;
  heroHeadline: string;
  heroSubcopy: string;
  heroSubcopyExtra: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroCtaSecondaryHref: string;
  // Header nav (when not authenticated)
  headerLogin: string;
  headerSignUp: string;
  // Section CTAs
  ctaViewDocs: string;
  ctaStartFree: string;
  ctaQuickStart: string;
  ctaPricingCompare: string;
  // Pricing section
  pricingSectionTitle: string;
  pricingSectionSubcopy: string;
  pricingCtaFree: string;
  pricingCtaPro: string;
  pricingCtaScale: string;
  pricingCtaHref: string;
  pricingIncentive: string | null;
  // Final CTA
  finalCtaHeadline: string;
  finalCtaSubcopy: string;
  finalCtaButton: string;
  finalCtaHref: string;
  // MCP / secondary
  mcpCta: string;
  mcpCtaHref: string;
};

const PRODUCT_COPY: LandingCopy = {
  heroEyebrow: 'The observability layer for every API and tool your software depends on',
  heroHeadline: 'One place for every external API and tool your software depends on, including the ones your AI agents call.',
  heroSubcopy: 'Latency, failures, cost, guardrails: per provider, per operation. Built for the dependency layer. Not generic APM.',
  heroSubcopyExtra: 'Catch latency spikes, errors, and cost anomalies across AI, payments, auth, messaging, and any external dependency, before they hit users or invoices.',
  heroCtaPrimary: 'Start monitoring your APIs',
  heroCtaSecondary: 'View documentation',
  heroCtaSecondaryHref: '/docs',
  headerLogin: 'Login',
  headerSignUp: 'Sign Up',
  ctaViewDocs: 'View documentation',
  ctaStartFree: 'Start free',
  ctaQuickStart: 'Start free · No credit card',
  ctaPricingCompare: 'Compare plans & full feature table',
  pricingSectionTitle: 'Simple, predictable',
  pricingSectionSubcopy: 'Scales with your API traffic. Built for SaaS and integrations, and the APIs your AI agents call. Free. Pro. Scale. No lock-in.',
  pricingCtaFree: 'Start monitoring your APIs',
  pricingCtaPro: 'Start Pro monitoring',
  pricingCtaScale: 'Start Scale plan',
  pricingCtaHref: '/login?signup=1',
  pricingIncentive: null,
  finalCtaHeadline: 'See every dependency before the next outage or bill spike.',
  finalCtaSubcopy: 'SaaS integrations. The tools your AI agents call. One place. Visibility, guardrails, dependency map.',
  finalCtaButton: 'Start free',
  finalCtaHref: '/login?signup=1',
  mcpCta: 'MCP setup',
  mcpCtaHref: '/docs#mcp-integration',
};

const WAITLIST_COPY: LandingCopy = {
  heroEyebrow: 'The observability layer for every API and tool your software depends on',
  heroHeadline: 'One place for every external API and tool your software depends on, including the ones your AI agents call.',
  heroSubcopy: 'Latency, failures, cost, guardrails: per provider, per operation. Built for the dependency layer. Not generic APM.',
  heroSubcopyExtra: 'Launching soon. Join early access to get first access and help shape the product.',
  heroCtaPrimary: 'Join Early Access',
  heroCtaSecondary: 'See how it works',
  heroCtaSecondaryHref: '/#features',
  headerLogin: 'Request Access',
  headerSignUp: 'Join Early Access',
  ctaViewDocs: 'View documentation',
  ctaStartFree: 'Join Early Access',
  ctaQuickStart: 'Join Early Access',
  ctaPricingCompare: 'See plans (launching soon)',
  pricingSectionTitle: 'Simple, predictable',
  pricingSectionSubcopy: 'Plans scale with your API traffic. Early users get priority onboarding and may qualify for a founding user plan.',
  pricingCtaFree: 'Join Early Access',
  pricingCtaPro: 'Join Early Access',
  pricingCtaScale: 'Join Early Access',
  pricingCtaHref: '/#waitlist',
  pricingIncentive: 'Early users get priority onboarding.',
  finalCtaHeadline: 'See every dependency before the next outage or bill spike.',
  finalCtaSubcopy: 'SaaS integrations. The tools your AI agents call. One place. Be among the first teams to get access.',
  finalCtaButton: 'Join Early Access',
  finalCtaHref: '/#waitlist',
  mcpCta: 'MCP setup',
  mcpCtaHref: '/docs#mcp-integration',
};

export function getLandingCopy(): LandingCopy {
  return isWaitlistMode() ? WAITLIST_COPY : PRODUCT_COPY;
}
