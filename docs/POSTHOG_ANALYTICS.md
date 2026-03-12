# PostHog Analytics

DependWatch uses [PostHog](https://posthog.com) for product analytics: acquisition, activation, first-value, engagement, billing funnel, and retention. The implementation is privacy-conscious and fails gracefully when keys are missing.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog project API key. Leave empty to disable analytics. |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog host, e.g. `https://us.i.posthog.com`. |
| `NEXT_PUBLIC_POSTHOG_DEBUG` | No | Set to `1` in development to log events to the browser console. |

**Local development:** If both key and host are unset, no events are sent and the app runs normally. No runtime errors.

**Staging/Production:** Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to enable analytics.

## Architecture

- **Client-only:** PostHog is initialized in the browser via `posthog-js`. No server-side SDK unless you add it for specific backend events.
- **Provider:** `PostHogProvider` in `apps/web/src/components/providers/posthog-provider.tsx` wraps the app (inside `SessionProvider`). It:
  - Initializes PostHog once when keys are present.
  - Captures pageviews on route change (manual `$pageview`; autocapture pageviews disabled to avoid duplicates).
  - Identifies the user when the NextAuth session is available (stable user ID).
  - Resets analytics on sign-out.
- **Helpers:** `apps/web/src/lib/posthog.ts` exposes `captureEvent()`, `identifyUser()`, `resetAnalytics()`, and a stable event taxonomy. All event properties are sanitized (no ingest keys, tokens, or raw payloads). (Dashboard data layer lives in `lib/analytics.ts`; do not confuse the two.)

## Event taxonomy

Events use consistent names: `[object]_[verb]` or action-oriented names. Custom events are used for product milestones; autocapture is limited to avoid noise.

**Acquisition / landing:** `landing_page_viewed`, `pricing_page_viewed`, `docs_page_viewed`, `signup_cta_clicked`, `login_cta_clicked`  
**Auth:** `auth_signup_started`, `auth_signup_completed`, `auth_login_completed`, `auth_provider_used`  
**Onboarding:** `workspace_created`, `project_created`, `ingest_key_copied`, `test_event_sent`, `first_event_received`, `onboarding_completed`  
**Product:** `dashboard_viewed`, `provider_details_viewed`, `operation_details_viewed`, `insights_viewed`, `guardrails_viewed`, `incident_viewed`, `dependency_graph_viewed`  
**MCP:** `mcp_setup_viewed`, `mcp_token_created`, `mcp_config_copied`  
**Billing:** `billing_page_viewed`, `pricing_plan_selected`, `checkout_started`, `checkout_completed`, `plan_upgraded`, `plan_downgraded`  
**Retention:** `project_has_real_events`, `first_insight_generated`, `first_guardrail_triggered`, `docs_revisited`, etc.

Full list: see `AnalyticsEvents` in `apps/web/src/lib/posthog.ts`.

## Identify / user context

- **When:** After the user is authenticated (NextAuth session available). Done in `PostHogIdentify` inside the provider.
- **Distinct ID:** NextAuth user ID (stable).
- **Person properties:** `email`, `name` (no secrets). Optional: `plan`, `workspace_count`, `project_count` (add in analytics.ts if you have them server-side).
- **Groups:** Not set by default. You can call `setGroup('workspace', workspaceId)` from dashboard/billing when workspace context is known.

## Privacy and data safety

- **Never sent:** Ingest keys, API keys, auth tokens, raw request/response bodies, or un-sanitized error content.
- **Sanitization:** `captureEvent()` and `identifyUser()` strip known sensitive keys and truncate long strings. See `sanitizeProperties` and `SENSITIVE_KEYS` in `posthog.ts`.
- **Copy actions:** We track that the user copied the ingest key or MCP config (e.g. `ingest_key_copied`, `mcp_config_copied`) but never the copied value.

## Adding new events

1. Add the event name to `AnalyticsEvents` in `apps/web/src/lib/posthog.ts`.
2. Call `captureEvent(AnalyticsEvents.your_event_name, { safeProp: 'value' })` from the relevant component. Keep properties minimal and safe.

## Manual QA checklist

- [ ] App loads and works with `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` unset (no errors, no network to PostHog).
- [ ] With keys set: PostHog initializes once; no duplicate `init` in console.
- [ ] Navigate between pages: one `$pageview` per route change; no duplicate pageviews for the same path.
- [ ] Sign in: after redirect, one `identify` with user ID and safe traits; no sensitive data in person properties.
- [ ] Sign out: `reset` is called; subsequent events are anonymous.
- [ ] Trigger key flows: signup CTA → login page → sign in → onboarding → workspace/project created → ingest key copied → go to dashboard → send test event → first event received. Verify corresponding events in PostHog (with debug on in dev).
- [ ] Billing: open billing page → start checkout → complete (or cancel). Verify `checkout_started` and, on return with `?success=1`, `checkout_completed`.
- [ ] MCP: open MCP page → create token → copy config. Verify `mcp_token_created` and `mcp_config_copied`; confirm no token value in events.
