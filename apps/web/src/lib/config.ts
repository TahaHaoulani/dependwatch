/**
 * Server configuration validation and resolution.
 * Validates required env when Stripe is first used; provides Stripe price → plan mapping.
 */

export type PlanId = 'free' | 'builder' | 'startup';

const REQUIRED_STRIPE_VARS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_BUILDER',
  'STRIPE_PRICE_STARTUP',
] as const;

let validated = false;

/**
 * Validates required Stripe env vars. Call when Stripe is first used (getStripe, webhook handler).
 * Throws with clear message if any are missing or empty.
 */
export function validateStripeConfig(): void {
  if (validated) return;
  const missing: string[] = [];
  for (const key of REQUIRED_STRIPE_VARS) {
    const v = process.env[key];
    if (v == null || String(v).trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    const msg = `Stripe configuration incomplete. Set these environment variables: ${missing.join(', ')}. See .env.example or docs for setup.`;
    console.error('[config]', msg);
    throw new Error(msg);
  }
  validated = true;
}

/**
 * Resolves Stripe price ID to planId. Use in webhooks and anywhere plan is derived from price.
 * Returns null for unknown price (caller should fall back to metadata or existing).
 */
export function resolvePlanFromPriceId(priceId: string | null | undefined): PlanId | null {
  if (priceId == null || priceId === '') return null;
  const builder = process.env.STRIPE_PRICE_BUILDER;
  const startup = process.env.STRIPE_PRICE_STARTUP;
  if (builder && priceId === builder) return 'builder';
  if (startup && priceId === startup) return 'startup';
  return null;
}

/**
 * Returns STRIPE_PRICE_BUILDER (for checkout/display). Only call after validateStripeConfig or in contexts where env is set.
 */
export function getStripePriceBuilder(): string {
  const v = process.env.STRIPE_PRICE_BUILDER;
  if (!v?.trim()) throw new Error('STRIPE_PRICE_BUILDER is not set');
  return v.trim();
}

/**
 * Returns STRIPE_PRICE_STARTUP. Only call after validateStripeConfig or in contexts where env is set.
 */
export function getStripePriceStartup(): string {
  const v = process.env.STRIPE_PRICE_STARTUP;
  if (!v?.trim()) throw new Error('STRIPE_PRICE_STARTUP is not set');
  return v.trim();
}
