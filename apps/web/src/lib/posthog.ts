/**
 * DependWatch product analytics — PostHog-backed, privacy-conscious event layer.
 * Use captureEvent() for product milestones; never send ingest keys, tokens, or raw payloads.
 */

import posthog from 'posthog-js';

const POSTHOG_ENABLED =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY &&
  process.env.NEXT_PUBLIC_POSTHOG_HOST;

// ——— Event names (stable taxonomy: [object] [verb] or action) ———

export const AnalyticsEvents = {
  // Acquisition / landing
  landing_page_viewed: 'landing_page_viewed',
  pricing_page_viewed: 'pricing_page_viewed',
  docs_page_viewed: 'docs_page_viewed',
  signup_cta_clicked: 'signup_cta_clicked',
  login_cta_clicked: 'login_cta_clicked',
  hero_cta_clicked: 'hero_cta_clicked',
  section_cta_clicked: 'section_cta_clicked',
  // Waitlist
  waitlist_form_view: 'waitlist_form_view',
  waitlist_submit_attempt: 'waitlist_submit_attempt',
  waitlist_submit_success: 'waitlist_submit_success',
  waitlist_submit_failure: 'waitlist_submit_failure',
  waitlist_submit_duplicate: 'waitlist_submit_duplicate',
  confirmation_email_sent: 'confirmation_email_sent',
  confirmation_email_failed: 'confirmation_email_failed',

  // Auth
  auth_signup_started: 'auth_signup_started',
  auth_signup_completed: 'auth_signup_completed',
  auth_login_completed: 'auth_login_completed',
  auth_provider_used: 'auth_provider_used',

  // Onboarding / activation
  workspace_created: 'workspace_created',
  project_created: 'project_created',
  ingest_key_copied: 'ingest_key_copied',
  test_event_sent: 'test_event_sent',
  first_event_received: 'first_event_received',
  onboarding_completed: 'onboarding_completed',

  // SDK / product usage
  sdk_quickstart_viewed: 'sdk_quickstart_viewed',
  sdk_install_copied: 'sdk_install_copied',
  sdk_example_copied: 'sdk_example_copied',
  dashboard_viewed: 'dashboard_viewed',
  provider_details_viewed: 'provider_details_viewed',
  operation_details_viewed: 'operation_details_viewed',
  insights_viewed: 'insights_viewed',
  guardrails_viewed: 'guardrails_viewed',
  incident_viewed: 'incident_viewed',
  dependency_graph_viewed: 'dependency_graph_viewed',

  // MCP / assistant
  mcp_setup_viewed: 'mcp_setup_viewed',
  mcp_token_created: 'mcp_token_created',
  mcp_config_copied: 'mcp_config_copied',
  assistant_integration_activated: 'assistant_integration_activated',

  // Billing / monetization
  pricing_plan_selected: 'pricing_plan_selected',
  checkout_started: 'checkout_started',
  checkout_completed: 'checkout_completed',
  billing_page_viewed: 'billing_page_viewed',
  plan_upgraded: 'plan_upgraded',
  plan_downgraded: 'plan_downgraded',
  usage_limit_viewed: 'usage_limit_viewed',
  overage_info_viewed: 'overage_info_viewed',

  // Retention / value
  project_has_real_events: 'project_has_real_events',
  first_insight_generated: 'first_insight_generated',
  first_guardrail_triggered: 'first_guardrail_triggered',
  first_alert_configured: 'first_alert_configured',
  slack_integration_configured: 'slack_integration_configured',
  docs_revisited: 'docs_revisited',
  returning_active_user: 'returning_active_user',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/** Properties we allow on events. Avoid any key that could hold secrets or raw payloads. */
export type SafeEventProperties = Record<
  string,
  string | number | boolean | undefined | null
>;

const SENSITIVE_KEYS = new Set([
  'ingestKey',
  'ingest_key',
  'apiKey',
  'api_key',
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'body',
  'payload',
  'request',
  'response',
]);

function sanitizeProperties(props: SafeEventProperties | undefined): SafeEventProperties | undefined {
  if (!props || typeof props !== 'object') return undefined;
  const out: SafeEventProperties = {};
  for (const [k, v] of Object.entries(props)) {
    const lower = k.toLowerCase();
    if (SENSITIVE_KEYS.has(k) || SENSITIVE_KEYS.has(lower)) continue;
    if (typeof v === 'string' && v.length > 500) {
      out[k] = '[truncated]';
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export function captureEvent(
  event: AnalyticsEventName | string,
  properties?: SafeEventProperties
): void {
  if (!POSTHOG_ENABLED) return;
  try {
    const safe = sanitizeProperties(properties);
    posthog.capture(event, safe);
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_POSTHOG_DEBUG === '1') {
      console.debug('[Analytics]', event, safe);
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] capture failed', e);
    }
  }
}

export function identifyUser(
  distinctId: string,
  traits?: {
    email?: string | null;
    name?: string | null;
    signup_method?: string;
    plan?: string;
    workspace_count?: number;
    project_count?: number;
    created_at?: string;
    role?: string;
  }
): void {
  if (!POSTHOG_ENABLED || !distinctId) return;
  try {
    const safe: Record<string, unknown> = {};
    if (traits?.email != null) safe.email = traits.email;
    if (traits?.name != null) safe.name = traits.name;
    if (traits?.signup_method != null) safe.signup_method = traits.signup_method;
    if (traits?.plan != null) safe.plan = traits.plan;
    if (traits?.workspace_count != null) safe.workspace_count = traits.workspace_count;
    if (traits?.project_count != null) safe.project_count = traits.project_count;
    if (traits?.created_at != null) safe.created_at = traits.created_at;
    if (traits?.role != null) safe.role = traits.role;
    posthog.identify(distinctId, Object.keys(safe).length ? safe : undefined);
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_POSTHOG_DEBUG === '1') {
      console.debug('[Analytics] identify', distinctId, safe);
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] identify failed', e);
    }
  }
}

export function setGroup(groupType: string, groupKey: string, groupProperties?: SafeEventProperties): void {
  if (!POSTHOG_ENABLED) return;
  try {
    posthog.group(groupType, groupKey, sanitizeProperties(groupProperties));
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Analytics] group failed', e);
    }
  }
}

export function resetAnalytics(): void {
  if (!POSTHOG_ENABLED) return;
  try {
    posthog.reset();
  } catch {
    // no-op
  }
}

export function isAnalyticsEnabled(): boolean {
  return !!POSTHOG_ENABLED;
}
