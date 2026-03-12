# DependWatch — Source of Truth

**Purpose:** Single authoritative context for the DependWatch platform. Audience: AI coding assistants, new engineers, product contributors, designers, operators. Use to understand what exists today, how it works, and how to extend without breaking coherence.

**How to use this document:** Provide this file as the primary context when working on DependWatch. Section numbers (§1–§19) are stable—reference them in prompts (e.g. “see §9”). When adding or changing features, update §3 (Current Product Scope), §9 (Pricing, Plans, and Enforcement), and §16 (Known Gaps).

**Last updated:** March 2025 (billing, clarity, architecture diagrams).

**Related docs:** `docs/DEPENDWATCH_ARCHITECTURE_DIAGRAMS.md` (Mermaid diagrams for architecture, flows, entities); `docs/OVERAGE_BILLING_RUNBOOK.md` (overage billing ops and production readiness); `docs/DEPENDWATCH_PRODUCTION_DEPLOYMENT_RUNBOOK.md` (production deployment on Vercel, Railway, Neon, Redis, npm).

---

## 1. What DependWatch Is

- **Definition:** External API observability platform: one dashboard for **latency, failures, and cost** of outbound API calls (OpenAI, Stripe, Twilio, Resend, etc.).
- **Target users:** Developers and teams shipping apps that depend on third-party APIs and need a single view of API reliability and spend.
- **Category:** DevTools / API observability (outbound dependency monitoring).
- **Problem:** Logs and APM are usually service-internal. DependWatch focuses on **outbound** calls and their outcomes (success/failure, duration, estimated cost).
- **Scope:** Ingest events from SDK or test flow → store in PostgreSQL → aggregate in `lib/analytics.ts` → serve dashboard (overview API + intelligence API) and alerts/digest. No runtime interception of API calls in this codebase; instrumentation is via SDK `wrap()` at call site.

**Terminology (use consistently in this doc and in code):**

| Term | Meaning |
|------|---------|
| **Plan display name** | Free, Pro, Scale (user-facing). |
| **planId** | `free`, `builder`, `startup` (Subscription.planId and code). |
| **Ingest key** | Key for `POST /api/ingest`; stored in ProjectApiKey; full key shown only at create/rotate. |
| **source** | `'sdk'` (from app/SDK) or `'demo'` (from “Send test events”). |
| **Overview API** | `GET /api/projects/:id/overview` — KPIs, usage, charts, provider table, operations table, recent failures, error spikes, top issue. |
| **Intelligence API** | `GET /api/projects/:id/intelligence` — insights, guardrails, dependency map (plan-gated). |
| **Dashboard section names** | KPI row, charts, event stream, provider table, operations table, recent failures, error spikes, insights, guardrails, dependency map, top issue, usage card. |

---

## 2. Product Ambition

- **Product goal:** Be the primary tool for monitoring external API health, cost, and risk. Delivered today: metrics (dashboard), intelligence (insights + guardrails), alerts (Slack), digest (preview + delivery + native scheduling), overage billing (Pro/Scale). Roadmap: runtime control (ApiPolicy execution).
- **Quality bar (concrete):**
  - No fake UI: do not show a feature as available if the backend does not support it or the user’s plan does not allow it.
  - Demo vs real: always exclude `source: 'demo'` from usage and cost; be explicit in UI when data is from test events.
  - Keys: full ingest key only at create/rotate; never stored or returned afterward.
  - Loading: use skeletons or explicit “Loading…”; do not show placeholder data as real metrics.
- **Platform direction:** Default choice for teams to observe external APIs, with optional automation (alerts, digests, MCP) and eventually runtime policies (retry/fallback/guardrail). All new capabilities must be gated by plan and enforced server-side.
- **ARR / business model:** No numeric ARR target in codebase or docs. Monetization: Free ($0), Pro ($29/mo, planId builder), Scale ($99/mo, planId startup). Overage billed at $5/100k (Pro) and $3/100k (Scale) via Stripe invoice items at period end. Success: clear upgrade path, enforced limits, no leakage of paid capabilities to Free.
- **Differentiation (factual):** Single place for outbound API latency + failures + cost; insights and guardrails derived from the same event store; Slack alerts and digest content; MCP tools for docs and project state; test events for zero-SDK activation. Not a generic APM; not an internal-service tracer.

---

## 3. Current Product Scope

### Implemented

| Area | Status | Notes |
|------|--------|------|
| **Auth** | Implemented | NextAuth: Google, GitHub, Email (magic link). Session + JWT in middleware. MFA (TOTP) supported. |
| **Workspaces & projects** | Implemented | Workspace → Projects. Invites (token-based). Roles: owner, admin, developer, viewer. |
| **Onboarding** | Implemented | Post-login: create workspace → create project → see ingest key. Redirect to dashboard. |
| **Ingest API** | Implemented | `POST /api/ingest` with Bearer or `x-dependwatch-key`. Validate ingest key, rate limit (300/min per project), enforce provider limit (planId free: 2), write events with `source: 'sdk'`. |
| **Test events** | Implemented | “Send test events” → `POST /api/projects/:id/test-events`. Persists with `source: 'demo'`. planId free: 2 providers (openai, stripe); builder/startup: 4 (+ twilio, resend). Excluded from usage and cost. |
| **Dashboard – overview** | Implemented | Overview API: KPI row, usage card, charts, provider table, operations table, recent failures, error spikes, top issue. Range: 24h, 7d, 30d, custom (Pro/Scale only). |
| **Dashboard – intelligence** | Implemented | Intelligence API: insights, guardrails, dependency map (plan-gated). Lazy-loaded on client. |
| **Dashboard – event stream** | Implemented | Event stream (recent events list), event detail dialog, operation detail. |
| **Usage & limits** | Implemented | `getProjectUsage()`: events this month (excluding demo), limit, overage count, provider count, max providers, projected cost, `hasDemoEvents`. Displayed in KPI row and usage settings. |
| **Pricing / plans** | Implemented | Free (planId free), Pro (builder), Scale (startup). Capabilities in `lib/pricing-capabilities.ts`; limits in `lib/stripe.ts`, `lib/pricing-constants.ts`. |
| **Plan enforcement** | Implemented | **Providers:** Ingest enforces max providers (free: 2, builder: 10, startup: unlimited). **AlertRule / SlackWebhookConfig:** create blocked at limit via getCapabilitiesForProject. **Dashboard:** Dependency map, custom range, 24h/30d presets gated by planLimits. **Digest:** Preview for all; “scheduled delivery” copy for Pro/Scale. |
| **API keys (ingest keys)** | Implemented | ProjectApiKey: create, list, rotate, delete. Full ingest key returned only at create/rotate; stored as keyHash + keyPrefix. Masked in UI; optional reveal of prefix. |
| **Alerts** | Implemented | AlertRule (latency, error rate, budget). `POST /api/projects/:id/alerts/evaluate` runs rules, sends to SlackWebhookConfig webhooks, records AlertEvent, cooldown. **Native scheduling:** ProjectScheduleConfig.alertEvaluationFrequencyMinutes (1/5/15 min); cron route `POST /api/cron/scheduler` (CRON_SECRET) runs evaluations; multi-instance safe via SchedulerLock. |
| **Slack webhooks** | Implemented | SlackWebhookConfig per project (url, enabled). Alert evaluation sends to all enabled; test endpoint to verify. |
| **Digest** | Implemented | `generateDigestContent()` + GET digest/preview, POST digest/deliver. **Native scheduling:** ProjectScheduleConfig (digestEnabled, frequency daily/weekly, timeOfDay, timezone); cron route runs digest delivery; `lib/digest-delivery.ts` runDigestDelivery(projectId, range). No external cron required. |
| **Settings** | Implemented | Workspace: general, members, invites, notifications, billing, activity, danger. Project: general, API keys, alerts (rules + Slack + digest preview), dependency controls (ApiPolicy CRUD), data retention, usage, MCP, danger. Account: profile, preferences (theme, timezone, notifications), security (MFA, sessions). |
| **Theme** | Implemented | User preference: dark, light, system. Theme provider and toggle in app. |
| **Billing** | Implemented | Stripe Checkout for Pro/Scale. Subscription model stores workspaceId, planId (free/builder/startup), Stripe IDs, currentPeriodStart/End. Webhook: checkout.session.completed, subscription.updated/deleted, invoice.finalized (logging). **Overage billing:** `lib/billing-usage.ts` (workspace billable events, period [start,end) exclusive, exclude demo); `lib/overage-billing.ts` (ensureOverageBillingForPeriod with P2002 handling and recovery under lock); cron `POST /api/cron/overage-billing` (CRON_SECRET). BillingOverageRecord per (workspaceId, periodStart) prevents double billing. Billing page: plan card, Usage card (included, used, over included, overage on next invoice), upgrade copy, invoice note. See docs/OVERAGE_BILLING_RUNBOOK.md. |
| **MCP** | Implemented | `/api/mcp` JSON-RPC. Public tools: search_docs, get_quickstart, get_sdk_install, get_provider_example, get_setup_steps, get_api_reference_summary. Auth tools: list_workspaces, list_projects, get_project_setup_status, send_test_event, get_project_overview, get_latest_provider_metrics. McpAccessToken: scoped, revocable. |
| **Legal / marketing** | Implemented | Public routes: pricing, docs, login, terms, privacy, cookies, acceptable-use, security, api-reliability. Marketing header/footer. |
| **Incidents** | Implemented | ApiIncident (status: open/acknowledged/resolved). IncidentReport (shareable public page). Guardrails can create ApiIncident; dashboard shows open incidents. |

### Partially implemented

| Area | Status | Notes |
|------|--------|------|
| **Event overage at ingest** | Implemented | **Free:** hard limit 10k events/month; ingest samples when at/over limit (progressive sampling). **Pro/Scale:** overage allowed; tracked and displayed; overage billed at period end via Stripe invoice items. |
| **(Resolved) Overage billing** | Implemented | Pro/Scale overage billed via Stripe invoice items; cron /api/cron/overage-billing. |
| **ApiPolicy (retry/fallback/guardrail)** | Partially implemented | Config stored and editable in UI (dependency controls). Runtime enforcement is documented as roadmap; policies are not executed by the app. |

### Planned (not in codebase)

| Item | Note |
|------|------|
| ApiPolicy runtime | Retry/fallback/guardrail config only; no execution in request path. |
| Email alert delivery | Alerts deliver to Slack only. Pricing/copy aligned to “Slack alerts” (no email claims). |

---

## 4. Core Product Flows

### Signup / authentication

1. User visits `/login` (or `/signup` → redirect to `/login?signup=1`).
2. Sign-in with Google, GitHub, or Email (magic link). NextAuth handles session; middleware uses JWT for protected routes.
3. After sign-in, middleware redirects to `/onboarding` if session exists and path was login.

### Onboarding

1. **Onboarding page** (`/onboarding`): If user already has a workspace and project, redirect to first project dashboard. Otherwise render OnboardingClient.
2. **Steps:** (1) Create workspace (name), (2) Create project (name) → API returns project + **ingest key (full key shown once)**, (3) Copy key and “Go to dashboard.”
3. Redirect: `GET /api/onboarding/redirect?workspaceId=…` → redirects to `/dashboard/:workspaceId` or first project under that workspace.

### Project creation (post-onboarding)

- `POST /api/workspaces` → create workspace.
- `POST /api/workspaces/:id/projects` → create project; backend creates default API key and returns it once in response.

### Ingest key generation and storage

- Keys created in `createProject` or via `createApiKey`. Format: prefix (e.g. `dw_live_…`) + hash stored; full key returned only at create/rotate.
- Ingest: `verifyIngestKey(key)` resolves key to projectId; rate limit per projectId; then `ingestEventsForProject(..., { source: 'sdk', allowedProviders })`.

### Test events

1. User clicks “Send test events” on dashboard (empty state or when no/limited data).
2. Client calls `POST /api/projects/:projectId/test-events`.
3. Server loads plan limits, gets `getSampleTestEvents(now, { maxProviders })` (planId free: 2 providers; builder/startup: 4), then `ingestEventsForProject(..., { source: 'ui_test' })` → persisted with `source: 'demo'`.
4. Dashboard refetches overview/events; empty state transitions to “10 test events added” and shows event stream. Demo events **do not** count toward usage/cost.

### SDK integration

- Developer sets `DEPENDWATCH_INGEST_KEY`, uses SDK `init()` and `wrap()` (or equivalent) to send events to `POST /api/ingest`. Docs and MCP tools describe install and provider examples.

### Dashboard usage

1. **Entry:** `/dashboard` → redirect to first workspace’s first project or workspace root.
2. **Project dashboard:** Overview API (KPI row, usage card, charts, provider table, operations table, recent failures, error spikes, top issue). Intelligence API (insights, guardrails, dependency map) loaded lazily. Range: 24h, 7d, 30d, custom—Free gets 7d only; Pro/Scale get all.
3. **Event stream:** `GET /api/projects/:id/events`; event detail and operation detail fetched on demand.

### Alert and Slack setup

1. Project Settings → Alerts: list/create/edit/delete AlertRules (latency, error rate, budget). Same page: add SlackWebhookConfig URL(s) per project. getCapabilitiesForProject enforces max alert rules and max Slack webhooks per plan.
2. “Test” webhook: sends a test message. Run evaluation: `POST /api/projects/:id/alerts/evaluate` (manual or external cron). Evaluates rules, sends to all enabled webhooks, records AlertEvent, respects per-rule cooldown. See §10.

### Settings management

- **Workspace:** General, Members, Invites, Notifications, Activity, Billing, Danger.
- **Project:** General, API keys, Alerts (rules + Slack + digest preview), Dependency controls (ApiPolicy), Data retention, Usage, MCP tokens, Danger.
- **Account:** Profile, Preferences (theme, timezone, notifications), Security (MFA, sessions).

### Upgrade / billing

1. Billing page shows current plan (from workspace Subscription). “Upgrade” calls `POST /api/stripe/checkout` with planId and workspaceId.
2. Stripe Checkout session created; user redirected to Stripe; on success redirect to billing with `?success=1`. Plan limits used across the app come from Subscription.planId (free/builder/startup).

---

## 5. Platform Architecture

### Stack

- Next.js 14 (App Router), React 18, Prisma (PostgreSQL), NextAuth, TanStack Query, Recharts, Tailwind, Radix UI. Monorepo: `apps/web`, `packages/dependwatch-cli`.

### Request and data flow

| Layer | Behavior |
|-------|----------|
| **Middleware** | JWT check for non-public paths. Public: `/`, `/pricing`, `/docs`, `/login`, `/terms`, `/privacy`, etc. Bypass auth: `/api/ingest`, `/api/auth`, `/api/webhooks`, `/api/health`, `/api/mcp`. |
| **Protected routes** | `/(app)/dashboard`, `/(app)/settings`, `/(app)/onboarding`. Each layout and page can call `auth()` (cached per request) and workspace/project resolution. `loading.tsx` and skeleton UIs exist for (app), dashboard, settings, account, onboarding, invite, incidents. Global navigation progress bar and button loading states give immediate feedback on route/action. |
| **Dashboard** | Client: DashboardView → useQuery Overview API, useQuery Intelligence API (lazy), useQuery events. Charts and operation dialog dynamic-imported. Range in URL (`?range=7d` etc.). |
| **Ingestion** | Single write path: `lib/ingest-service.ts` → `ingestEventsForProject()`. Called by `POST /api/ingest`, `POST /api/projects/:id/test-events`, and MCP `send_test_event`. Normalizes payload to ApiCallEvent; sets `source: 'sdk'` or `'demo'`. |
| **Dashboard metrics** | Read path: `lib/analytics.ts` over ApiCallEvent. Overview API batches stats, byProvider, byOperation, timeseries, failures, errorSpikes, topIssue, usage. Intelligence API adds insights, guardrails, dependency map. Product analytics: PostHog `lib/posthog.ts`. |

### Redis layer (optional)

When `REDIS_URL` is set, Redis is used for:

| Use | Module | Fallback when Redis unavailable |
|-----|--------|----------------------------------|
| **Cache** | `lib/cache` | In-memory (per-process; single-instance only). |
| **Locks** | `lib/locks` | DB (`SchedulerLock`) so distributed correctness is preserved. |
| **Rate limit** | `lib/rate-limit` | In-memory per process (resets on deploy; single-instance). |
| **Idempotency** | Cache key `idempotency:stripe:<event.id>` | No idempotency (Stripe retries may reprocess). |

- **Overview / Intelligence APIs:** Responses cached by `(projectId, range)` with TTL 45s / 60s. Invalidated when events are ingested (`lib/ingest-service.ts` calls `invalidateProjectDashboardCache(projectId)` after writes).
- **Ingest rate limit:** 300 req/min per project; Redis-backed when available.
- **Scheduler / overage / digest:** `acquireLock` / `releaseLock` from `lib/locks` use Redis first, then DB. Prevents duplicate alert runs, duplicate digest delivery, duplicate overage billing.
- **Stripe webhook:** Event idempotency key stored in cache (24h TTL) so duplicate deliveries return 200 without reprocessing.
- **Health:** `GET /api/health` returns `redis: ok | unhealthy | disabled`.

### Key server modules

| Module | Responsibility |
|--------|----------------|
| `lib/redis/*` | Client, config, health. Lazy connect; no crash when Redis is down. |
| `lib/cache` | get/set/getOrSet/del/byPrefix; cacheKey(); used by overview, intelligence, Stripe idempotency. |
| `lib/locks` | acquireLock/releaseLock; Redis SET NX or DB SchedulerLock fallback. |
| `lib/rate-limit` | checkRateLimit(key, { windowMs, maxRequests }); used by ingest API. |
| `lib/auth-server.ts` | `auth()` = cached getServerSession for RSC. |
| `lib/analytics.ts` | Aggregations over ApiCallEvent (stats, byProvider, byOperation, timeseries, failures, insights, guardrails, dependency map). |
| `lib/ingest-service.ts` | Normalize and persist events; `getSampleTestEvents()` for demo. Invalidates dashboard cache after writes. |
| `lib/usage.ts` | `getProjectUsage()`: events this month (excl. demo), limit, overage, provider count, projected cost. |
| `lib/billing-usage.ts` | `getWorkspaceBillableEventsForPeriod`, `getWorkspaceBillableUsageForPeriod` (period [start,end) exclusive, exclude demo). Source of truth for billable usage. |
| `lib/overage-billing.ts` | `ensureOverageBillingForPeriod` (idempotent, P2002 handling, recovery under lock), `runOverageBillingForEligibleSubscriptions`. Uses `lib/locks`. |
| `lib/pricing-capabilities.ts` | `getPlanCapabilities(planId)`, `getCapabilitiesForProject(projectId)`. Max alert rules, Slack webhooks, digest/delivery, cooldown. |
| `lib/stripe.ts` | Stripe client, `getPlanLimits(planId)` (events, providers, retention, feature flags). |
| `lib/alert-evaluate.ts` | `evaluateAlertRules()`: run rules, send to Slack, record AlertEvent, cooldown. |
| `lib/digest.ts` | `generateDigestContent()`, `formatDigestAsText()`. |
| `lib/project.ts` | getProjectById, createProject, createApiKey, verifyIngestKey, rotate key. |
| `lib/workspace.ts` | getWorkspaceById, getWorkspacesForUser, members, invites. |

---

## 6. Data Model / Important Entities

- **User, Account, Session, VerificationToken:** NextAuth; User has memberships, preference, MCP tokens.
- **Workspace:** Name, slug, optional slackWebhookUrl (legacy/workspace-level). Has members (WorkspaceMember), projects, subscription, invites.
- **WorkspaceMember:** userId, workspaceId, role (owner, admin, developer, viewer).
- **WorkspaceInvite:** token-based invite; email, role, expires.
- **Project:** Name, slug, workspaceId, optional environment, retentionDaysOverride, archivedAt. Has apiKeys, events, alertRules, providerConfigs, incidentReports, apiPolicies, incidents.
- **ProjectApiKey:** name, keyPrefix, keyHash, projectId, lastUsedAt, rotatedAt, environmentTag. Full key never stored.
- **ApiCallEvent:** projectId, timestamp, provider, serviceName, endpoint, method, environment, durationMs, statusCode, success, errorType, errorMessage, requestCount, estimatedCostUsd, metadata, region, **source** ('sdk' | 'demo').
- **Subscription:** workspaceId (unique), stripeCustomerId, stripeSubscriptionId, stripePriceId, status, planId (free | builder | startup), currentPeriodStart/End, cancelAtPeriodEnd.
- **BillingOverageRecord:** workspaceId, periodStart, periodEnd, overageEvents, amountCents, stripeInvoiceItemId; unique (workspaceId, periodStart). Ensures one overage invoice item per period; recovery path under SchedulerLock when record exists but Stripe item failed.
- **ProviderCatalog, ProjectProviderConfig:** Provider catalog and per-project cost overrides (used for cost attribution).
- **AlertRule:** projectId, name, enabled, latencyThresholdMs, errorRateThresholdPercent, monthlyBudgetUsd, cooldownMinutes.
- **AlertEvent:** projectId, ruleId, type, severity, message, payload, channel, sentAt (audit of sent alerts).
- **SlackWebhookConfig:** projectId, url, enabled (per-project webhooks for alert delivery).
- **ApiIncident:** projectId, provider, endpoint, type, message, status (open/acknowledged/resolved), assignedToId, note, resolvedAt.
- **IncidentReport:** projectId, publicId, provider, endpoint, detectionType, message, metrics, timeline (shareable public page).
- **ApiPolicy:** projectId, type (retry, fallback, guardrail), name, enabled, config (JSON); config-only, no runtime enforcement in app.
- **McpAccessToken:** userId, optional workspaceId, tokenHash, tokenPrefix, scopes, lastUsedAt, revokedAt.
- **UserPreference:** userId, theme (dark/light/system), timezone, dateFormat, defaultLandingPage, emailNotifications, billingNotifications, alertDigest (instant/daily/weekly).
- **AuditLog:** workspaceId, projectId, userId, action, resource, resourceId, metadata (optional audit trail).

---

## 7. Dashboard Source of Truth

Dashboard sections use the stable names in the terminology table (§1). Data: **Overview API** returns stats, byProvider, byOperation, timeseries, recentFailures, errorSpikes, topIssue, usage, planLimits. **Intelligence API** returns insights, guardrails, dependency map (when plan allows).

- **KPI row:** Overview API: totalCalls, errors, errorRate, avgLatencyMs, p50/p95/p99, costUsd (excl. demo), projectedMonthlyCostUsd. Component: DashboardKpiRow.
- **Charts:** Overview API timeseries (calls, latency, cost) and by-provider; lazy-loaded DashboardCharts (Recharts). Annotations for error spikes.
- **Event stream:** `GET /api/projects/:id/events`; event detail and operation detail on demand. Recent failures with optional “from test events” badge.
- **Provider table:** byProvider from Overview API (calls, errors, errorRate, p50/p95, costUsd). ApiCallEvent: counts include sdk+demo; cost excludes demo.
- **Operations table:** byOperation from Overview API. Shown when plan allows operation-level analytics (Pro/Scale).
- **Recent failures:** recentFailures from Overview API; badge when from test events.
- **Error spikes:** errorSpikes from Overview API; windows where provider error rate exceeded threshold (e.g. 10%).
- **Insights:** Intelligence API: projectInsights + generic insights. planId free may have limited insights (insightsLimited).
- **Guardrails:** Intelligence API: cost_spike, error_spike, latency_spike, traffic_anomaly (traffic_anomaly: Scale only). Can create ApiIncident; DashboardGuardrailsSection, DashboardOpenIncidents.
- **Dependency map:** Intelligence API when planLimits.dependencyGraph (Pro/Scale). Reliability and cost per provider.
- **Top issue:** getTopIssue() in Overview API; single “what needs attention” item.
- **Usage card:** usage from Overview API (eventsThisMonth, limit, overageEvents, providerCount, maxProviders, planName, projectedApiCostMonitored, hasDemoEvents). Demo never counts.
- **Gated by plan:** Dependency map, custom range, 24h/30d presets, operation-level analytics, full insights/guardrails → planLimits/capabilities. Empty state: “Send test events” + sample-data preview.

**Data semantics (critical for any new feature):** For the selected range, **counts** (totalCalls, errors, latency percentiles) include all events (`sdk` + `demo`). **Cost** (costUsd, projectedMonthlyCostUsd) and **usage** (eventsThisMonth, overage) exclude `source: 'demo'`. Implement any new metric or billing logic consistently with this split.

---

## 8. Test Events / Demo Data

- **Endpoint:** `POST /api/projects/:projectId/test-events`. Server calls `getSampleTestEvents(now, { maxProviders })` then `ingestEventsForProject(..., { source: 'ui_test' })` → persisted with **source = 'demo'**.
- **Seeded providers:** planId free: openai, stripe (2). planId builder/startup: openai, stripe, twilio, resend (4). Same payload used by MCP send_test_event.
- **Included in:** KPI row totalCalls, charts, event stream, recent failures (empty state fills immediately).
- **Excluded from:** eventsThisMonth, overage, costUsd, provider-limit logic at ingest. Implemented in `getProjectUsage()` and analytics cost aggregation (`baseWhereExcludeDemo` / `FILTER (WHERE source IS DISTINCT FROM 'demo')`).
- **Activation flow:** Empty state → “Send test events” → 10 events → success state with event list + “Next step: monitor your real APIs” and SDK snippet.

---

## 9. Pricing, Plans, and Enforcement

- **Plans:** Display names Free, Pro, Scale. Plan IDs (Subscription.planId): `free`, `builder`, `startup`. Free $0; Pro (builder) $29/mo; Scale (startup) $99/mo.
- **Positioning:** Free: 2 providers, 7-day history. Pro: 10 providers, 90-day history, operation-level analytics, insights, guardrails, dependency map, digest preview. Scale: unlimited providers, 365-day history, Slack webhooks, traffic_anomaly guardrail, team workspace.
- **Event limits** (`lib/pricing-constants.ts`): free 10k, builder 100k, startup 1M events/month. **Free:** ingest enforces 10k via sampling when at/over limit; no paid overage. **Pro/Scale:** overage allowed; billed at $5/100k (Pro) or $3/100k (Scale) via Stripe invoice items at period end; `OVERAGE_CENTS_PER_100K`, `overageCentsForPlan()`; billable usage excludes demo (`lib/billing-usage.ts`).
- **Enforced in code:**
  - **Providers:** Ingest enforces max providers (free: 2, builder: 10, startup: unlimited). Events for providers beyond top N skipped; response may include `skipped`.
  - **Free plan event cap:** When eventsThisMonth >= 10k, ingest samples incoming events (sampleRate = 10k/(count+1), min 0.1); response may include `sampled: true`.
  - **AlertRule / SlackWebhookConfig / Dashboard:** As above. **Subscription:** Every workspace has exactly one Subscription; `getWorkspaceSubscription(workspaceId)` fetches or auto-creates (planId free). All plan reads use it. Stripe webhook upserts on checkout and subscription events.
- **Stripe config:** `lib/config.ts` validates STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_BUILDER, STRIPE_PRICE_STARTUP when Stripe is first used. `resolvePlanFromPriceId(priceId)` maps price to planId; webhook uses it and logs warning for unknown priceId.
- **Stripe webhook:** checkout.session.completed (upsert by workspaceId); customer.subscription.updated/deleted (planId via resolvePlanFromPriceId, else metadata/existing; on deleted set planId free, clear Stripe IDs); invoice.finalized (logging for audit).
- **Overage billing:** Workspace-level billable events (excl. demo) in `getWorkspaceBillableUsageForPeriod`; overage = billable − included; amount via `overageCentsForPlan`. Cron `POST /api/cron/overage-billing` runs `runOverageBillingForEligibleSubscriptions` (period ends within 7 days); creates one Stripe invoice item per workspace per period and one BillingOverageRecord (idempotent). Free plan never receives overage invoice items.

**Capability table (concise):**

| Capability           | Free | Pro (builder) | Scale (startup) |
|---------------------|------|----------------|-----------------|
| Alert rules         | 1    | 10             | Unlimited       |
| Slack webhooks      | 0    | 3              | Unlimited       |
| Digest preview      | Yes  | Yes            | Yes             |
| Digest delivery     | No   | Yes (built-in) | Yes (built-in)  |
| Alert cooldown min  | 30   | 5              | 1               |
| Providers (ingest)  | 2    | 10             | Unlimited       |
| Events/month (included) | 10k | 100k | 1M        |
| Overage             | Hard cap (no charge) | $5/100k events | $3/100k events |

---

## 10. Alerts System

- **AlertRule:** Persisted. Types: latency (threshold ms), error rate (threshold %), budget (monthly USD). Per-rule cooldown (minutes). Enabled/disabled. CRUD: `/api/projects/:id/alert-rules`, `:id/alert-rules/:ruleId`. getCapabilitiesForProject enforces max rules on create.
- **Evaluation:** `evaluateAlertRules()` in `lib/alert-evaluate.ts`. getProjectStats (24h for latency/error, 30d for budget); compare to rule thresholds; cooldown via last AlertEvent.sentAt per rule.
- **Delivery:** Slack only. All enabled SlackWebhookConfig for the project receive same payload (`formatSlackIncidentBlocks`). AlertEvent recorded per send. Email delivery not implemented; pricing and UI describe “Slack alerts” only.
- **Digest:** generateDigestContent(), GET digest/preview, POST digest/deliver, `lib/digest-delivery.ts` runDigestDelivery(). ProjectScheduleConfig: digest enabled/frequency/time/timezone; native scheduler runs via POST /api/cron/scheduler (CRON_SECRET). Settings → Alerts: Automated schedule card.

---

## 11. Settings System

- **Workspace settings:** General (name, slug, description), Members (list, role, remove), Invites (create, accept link), Notifications (workspace-level), Activity (audit), Billing (plan, upgrade), Danger (delete workspace). Slack webhook URL at workspace level exists in schema (slackWebhookUrl) for legacy/workspace use; project-level Slack webhooks are the main path for alerts.
- **Project settings:** General (name, slug, description, environment), API keys (ingest keys: create, rotate, delete; full key once), Alerts (AlertRules + SlackWebhookConfig + digest preview), Dependency controls (ApiPolicy CRUD), Data retention (override), Usage (usage card + plan), MCP (McpAccessToken), Danger (archive/delete).
- **Account settings:** Profile, Preferences (theme, timezone, date format, default landing, email/billing notifications, alert digest preference), Security (MFA enroll/disable, sessions list, revoke all).
- **Permission model:** ensureCanEditProject / ensureWorkspaceAdmin guard mutations. Roles: owner, admin, developer, viewer. Billing and danger-zone actions require admin/owner. Theme and UserPreference persisted; MCP tokens scoped (docs, projects, test-event, metrics) and revocable.

---

## 12. Security / Trustworthiness Principles

- **Key handling:** Ingest keys (ProjectApiKey): hashed (e.g. SHA-256); only keyPrefix and keyHash stored. Full key returned **once** at create and **once** at rotate; never stored or returned again. UI shows keyPrefix with optional “Reveal”; copy: “full key shown once.”
- **Auth/session:** NextAuth session; middleware validates JWT for protected routes. Session version and MFA supported; revoke-all-sessions available.
- **Plan enforcement:** Backend enforces limits (alert rules, Slack webhooks, ingest providers). Frontend gates UI (disable presets, hide dependency map) so users don’t see paid features as usable on Free without upgrade.
- **No fake UI:** Do not show a capability as available if the backend would reject it (e.g. “scheduled digest” without a scheduler). Usage and cost exclude demo; any “test events don’t count” label must match code.
- **Consistency rule:** Same key semantics (full key once), same usage definition (excl. demo), and same plan limits must be used in ingest, dashboard, usage API, and settings. New gating: implement in `pricing-capabilities` or `stripe` and enforce in the API route; then gate UI on capabilities.

---

## 13. UX / Design Principles

- **Dashboard order:** KPI row → charts → provider table → operations table → insights → guardrails → dependency map (if plan allows). Empty state: one CTA “Send test events” and preview card “Sample data only.”
- **Loading:** Use skeletons or explicit “Loading…” text; do not show placeholder numbers as real metrics.
- **Navigation loading:** Global top progress bar (NavigationProgress) on route change; route-level `loading.tsx` with skeleton layout for dashboard, settings, onboarding, invite, incidents; Button `loading` prop for nav-triggering actions (onboarding, create workspace/project, billing upgrade, invite accept, danger delete). Layouts persist while segment content loads to avoid full-page blank.
- **Theme:** UserPreference.theme (dark/light/system); theme provider + CSS variables; muted, warning, destructive, primary for state.
- **Settings:** Workspace / project / account grouping. Destructive actions only in “Danger” sections with confirmation.
- **Upgrade and pricing:** Capability-gated UI must show upgrade when at limit (e.g. “Upgrade to Pro for more rules”), not a broken or silent failure. Pricing page and docs must match `lib/pricing-capabilities.ts` and `lib/stripe.ts` (limits, overage copy).
- **Settings clarity:** Alerts/digest/billing must distinguish what is active vs configured vs preview: e.g. Slack webhooks show “Active”/“Paused”; digest labels “Preview” (in-app only, not sent) vs “Delivery” (cron-callable, sends to enabled webhooks); billing shows clear success/cancel feedback after checkout. Empty states for “no rules yet,” “no webhooks yet,” and “add webhooks to receive alerts” keep partial config honest.
- **Terminology:** Use terms from §1 table: planId (free/builder/startup), ingest key, source (sdk/demo), Overview API, Intelligence API, dashboard section names (KPI row, provider table, etc.).
- **Architecture diagrams:** See `docs/DEPENDWATCH_ARCHITECTURE_DIAGRAMS.md` for Mermaid diagrams (high-level architecture, routes, auth, onboarding, ingestion, dashboard, alerts, digest, billing, plan enforcement, settings, permissions, MCP, entities, demo vs real).

---

## 14. Performance Principles

- **Dashboard:** Overview API is designed for fast first paint (<1s target): single parallel batch for KPIs, usage, charts, provider/operation, failures, error spikes, top issue. **Cached** (Redis or in-memory) by projectId + range (TTL 45s); invalidated on ingest and test-events. Intelligence API is a separate, lazy-loaded request; **cached** (TTL 60s) and invalidated the same way.
- **Avoid blocking:** Heavy sections (charts, operation detail) are lazy-loaded. Refetch intervals: overview 30s when has data, 5s when not; intelligence 60s; events 15s.
- **Route transitions:** auth(), getWorkspaceById, getProjectById, getProjectsForWorkspace, getWorkspacesForUser use React cache() for request-level deduplication. Global navigation progress bar (components/navigation/navigation-progress.tsx) shows on pathname change. loading.tsx with skeleton layout exist for (app), dashboard [workspaceId], [projectId], workspace/project settings, account settings, onboarding, invite/accept, incidents. Button loading states prevent double-clicks on create workspace/project, billing upgrade, invite accept, danger delete. See docs/NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md for further optimization.
- **Redis:** When REDIS_URL is set, overview/intelligence responses and ingest rate limits use Redis; locks (scheduler, digest, overage) use Redis with DB fallback. When Redis is unavailable, cache and rate limit fall back to in-memory (per-process); locks fall back to DB so correctness is preserved.
- **Charts:** Recharts in a dynamic-imported component; skeleton while loading. Timeseries bounded by range and retention.

---

## 15. Differentiation (factual)

- Single product surface for **outbound** API latency, failures, and cost (not internal-service APM).
- One event model (ApiCallEvent) and one ingest path; dashboard and alerts consume the same store.
- Insights and guardrails computed from that store; incidents and shareable incident reports.
- Alerts: rule evaluation + Slack; digest: content + preview + built-in scheduling (no external cron).
- MCP: public doc tools + authenticated project/workspace and send_test_event; supports AI assistants.
- Activation: test events populate dashboard without SDK; usage/cost exclude demo.

---

## 16. Known Gaps (consolidated)

| Gap | Current state |
|-----|----------------|
| Event overage at ingest | Free: 10k hard cap with sampling. Pro/Scale: overage billed via Stripe invoice items (cron /api/cron/overage-billing). Billing period [start,end) exclusive; demo excluded; BillingOverageRecord + recovery under lock. Pricing, FAQ, landing, terms state overage is billed. |
| ApiPolicy runtime | DB and UI for retry/fallback/guardrail config; no execution in request path. |
| Navigation performance | Request-level caching (cache()) for auth and workspace/project; loading.tsx for dashboard and settings. Overview and Intelligence APIs are cached (Redis or in-memory) with short TTL and invalidation on write; see docs/NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md for further optimization. |
| Email alert delivery | Not implemented. Alerts deliver to Slack only. Pricing and comparison table aligned to “Slack alerts” / “Slack webhooks” (no email claims). |

---

## 17. Recommended Next Priorities

Ordered by dependency and impact. Each item is done when the stated outcome is true.

| # | Priority | Done when |
|---|----------|-----------|
| 1 | **Stripe webhook** | Done. `POST /api/webhooks/stripe` handles checkout.session.completed, customer.subscription.updated, customer.subscription.deleted; updates Subscription.planId, status, period; on deleted sets planId to free. |
| 2 | **Align Slack vs plan copy** | Done. Pricing page and comparison table state Free: 1 rule no Slack; Pro: 10 rules, 3 Slack webhooks; Scale: unlimited. No email alert claims. |
| 3 | **Loading boundaries** | Done. `loading.tsx` with skeleton UIs for (app), dashboard [workspaceId], [projectId], workspace/project settings, account, onboarding, invite/accept, incidents. Global navigation progress bar and Button `loading` prop for nav-triggering actions. |
| 4 | **Event overage behavior** | Done. Free: hard cap + sampling. Pro/Scale: overage billed via Stripe invoice items; lib/billing-usage, overage-billing; BillingOverageRecord; cron overage-billing. |
| 5 | **Digest delivery** | Done. POST `/api/projects/:id/digest/deliver` generates digest and sends to all enabled project Slack webhooks; plan-gated; documented in Settings → Alerts. Call from cron for scheduled delivery. |
| 6 | **Navigation/layout dedup** | Deferred. Optional optimization; not blocking launch. See NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md. |

---

## 18. Rules for Future Contributors and AIs

1. **Verify before documenting.** Before stating that a feature exists, confirm it in code (route, DB, or lib). If it does not exist, label it “Planned” or “Not implemented.” Do not document UI-only behavior that has no backend.
2. **Single source of truth for plans.** All limits and plan-gated features come from `lib/pricing-capabilities.ts` and `lib/stripe.ts`. New gating: add there, enforce in the API route (return 403 or 400 with clear message), then gate UI on the same capabilities.
3. **No fake UI.** Do not show a control or feature as available if the backend would reject the action or the user’s plan does not allow it. Disable or hide and show an upgrade prompt.
4. **Demo vs real is binary.** `source: 'demo'` must never be counted in usage (eventsThisMonth, overage) or cost (costUsd, projected cost). It may be included in totalCalls and charts. Any new metric or billing logic must follow this; when in doubt, exclude demo.
5. **Loading and empty states.** Use skeletons or explicit “Loading…”; do not show placeholder numbers as real. Empty state must have a clear next step (e.g. “Send test events” or “Add API key”).
6. **Protect activation and upgrade.** Do not break the first-run flow (onboarding → project → key → test events). Do not allow using paid capabilities (e.g. Slack webhooks, dependency map) on Free without enforcement; show upgrade path instead.
7. **Centralize plan logic.** New limits or plan features: add to pricing-capabilities or stripe/constants; use getCapabilitiesForProject / getPlanLimits in both API and UI. Do not hardcode plan checks in components.
8. **Keys: show full key only once.** At create and rotate, return the full key in the response once; never store it; never return or log it again. Store only hash + prefix. UI must not suggest the full key is available after that.
9. **Coherent surfaces.** New settings live under existing workspace/project/account structure. Dashboard data comes from overview and intelligence APIs (or a documented new API). Onboarding must still produce workspace + project + key.
10. **Label implementation status.** In this doc and in PRs, use exactly: **Implemented**, **Partially implemented**, **Planned**. Do not use “supported,” “available,” or “enabled” without specifying whether the backend implements it.

---

## 19. Quick Context Summary for AI Handoff

Read this section first; then jump to the section that matches your task. For canonical terms (planId, ingest key, Overview API, dashboard section names), see the terminology table in §1.

- **Product (§1–2):** External API observability (latency + failures + cost). One dashboard, Free/Pro/Scale (planId free/builder/startup), ingest API + SDK, test events, Slack alerts, digest preview, MCP. Quality bar: no fake UI, source 'demo' excluded from usage/cost, full ingest key once.
- **What’s real vs not (§3, §16):** Implemented: auth, workspaces, projects, onboarding, ingest (provider cap + free 10k sampling), test events, overview + intelligence APIs, usage, plan enforcement, API keys, alerts (Slack only), digest preview + deliver + **native scheduling**, settings (incl. Automated schedule), billing (Checkout + overage billing via Stripe invoice items, BillingOverageRecord, cron overage-billing), Stripe webhook + config validation + resolvePlanFromPriceId, **subscription consistency** (getWorkspaceSubscription), **scheduler** (POST /api/cron/scheduler). Partially/planned: ApiPolicy runtime, email alerts. See tables in §3 and §16.
- **Architecture (§5):** Next.js 14 App Router, Prisma/PostgreSQL. One ingest path: `ingest-service.ts`. Dashboard: overview API (fast) + intelligence API (lazy). Plan/capabilities: `pricing-capabilities.ts` + `stripe.ts`. Billing: `billing-usage.ts`, `overage-billing.ts`. Key modules table in §5. Diagrams: `docs/DEPENDWATCH_ARCHITECTURE_DIAGRAMS.md`. Overage ops: `docs/OVERAGE_BILLING_RUNBOOK.md`.
- **Data rule (§7–8):** Counts (calls, errors, latency) include sdk + demo. Usage and cost exclude demo. Plan from Subscription.planId.
- **If changing limits or features:** §9 (enforcement), §18 rules 2, 4, 7. Use getCapabilitiesForProject / getPlanLimits; enforce in API then gate UI.
- **If adding a metric or billing:** §7 data semantics, §18 rule 4. Exclude `source: 'demo'` from usage and cost.
- **Next work (§17):** Priorities 1–5 done (Stripe webhook, Slack copy, loading, overage honesty, digest deliver). Optional: navigation/layout dedup (§17 #6).

**When you extend the product:** Update this file (especially §3, §9, §16) so the next handoff stays accurate.

---

*This document is the main DependWatch context file. Give it to any future AI or contributor as the primary source of truth; use section references (§n) in follow-up prompts.*
