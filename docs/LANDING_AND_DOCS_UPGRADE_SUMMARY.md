# DependWatch — Landing Page & Documentation Upgrade Summary

This document summarizes the strategic product-marketing and developer-documentation upgrade performed after a full codebase audit. All content reflects **real implemented features**; no enterprise fantasies or generic SaaS copy were added.

---

## 1. Landing Page Improvements

### Positioning changes
- **Hero**: Headline updated to *"See latency, failures, and cost across every API you depend on"* with a subhead that names the product’s scope (OpenAI, Stripe, Twilio, Resend, Clerk, any third-party HTTP API) and core outcomes (latency, failures, guardrails, projected spend).
- **Primary CTA**: *"Start monitoring your APIs"* (replacing *"Start Monitoring APIs — Free"*).
- **Secondary CTA**: *"View documentation"* (replacing *"View Demo"*).
- **Trust**: Tagline set to *"Built for the APIs modern SaaS actually runs on"* and partner logos retained (OpenAI, Stripe, Twilio, Supabase, Clerk, Resend).

### Problem section
- Pain points made explicit: users complain, support tickets, invoice spikes, deploy-induced API failures.
- Closing line: *"DependWatch solves this: observability for every external API your product depends on."*

### Feature sections (real product depth)
- **API observability**: Total calls, avg latency, error rate, projected monthly cost, provider breakdown, real-time event stream.
- **Operation-level analytics**: Operations like `openai.chat.completions`, `stripe.paymentIntents.create`; slow, failing, and expensive endpoints.
- **API Intelligence**: Auto-generated insights (cost drivers, reliability issues, slow operations, cost spike).
- **Guardrails**: Cost spike, error spike, latency spike, traffic anomaly detection.
- **Real-time event stream**: Recent API events and failures.
- **Cost forecasting**: Projected monthly spend, provider/operation cost drivers.

### How it works
- **4 steps**: (1) Create project and copy ingest key, (2) Install SDK, (3) Wrap API calls, (4) Watch events, insights, and guardrails in DependWatch.
- **Real SDK**: `npm install @dependwatch/sdk-node` and a real `init` + `wrap()` snippet (from the repo) with `estimated_cost_usd`.

### Onboarding / first value
- New section: *"Get your first insight in under 2 minutes"* — create project, send test event (no code), then install SDK for real traffic.

### MCP / coding assistant
- New section: *"Use DependWatch from Cursor and Claude Code"* — MCP for docs search, list projects, send test events, view metrics; token created in Project → Connect assistant or Settings.

### Pricing section (materially improved)
- **Plans aligned with `lib/stripe.ts`**:
  - **Free**: $0 — 10,000 events/month, 2 APIs, 7-day retention, email alerts, dashboard, test events.
  - **Pro**: $29/mo — 100,000 events/month, 10 APIs, 90-day retention, email alerts, cost forecasting, operation-level analytics, guardrails.
  - **Scale**: $99/mo — 1,000,000 events/month, unlimited APIs, 365-day retention, Slack alerts, anomaly detection, team workspace.
- Each card shows **events/month**, **APIs**, and **retention** in a small summary block.
- Link to *"Compare plans"* (e.g. `/pricing`) and upgrade from workspace billing.

### Use cases
- New section *"Best for teams building with"*: AI APIs, Payments, Messaging/notifications, Auth & backend — with concrete examples (e.g. detect OpenAI cost spikes, catch Stripe regressions, monitor Twilio/Resend).

### Final CTA
- *"Start monitoring your APIs before the next outage or invoice spike."*

### Hero visual
- Hero dashboard preview unchanged in layout; a **guardrail-style badge** added (*"Cost spike · OpenAI"*) so the hero shows projected cost, provider breakdown, and a guardrail/alert feel.

---

## 2. Documentation Improvements

### New IA / structure
- **Observability**: Added *Operation-Level Analytics* and *Event Stream & Recent Failures*.
- **Insights & Guardrails**: New group with *API Intelligence (Insights)* and *Guardrails*.

### New or expanded sections
- **Quickstart**: Added optional step *"Send a test event"* and clarified that insights and guardrails appear automatically.
- **Operation-Level Analytics**: Documents operations (provider + endpoint), Operations table, operation detail (P50/P95/P99, calls over time, cost trend, recent failures).
- **Event Stream & Recent Failures**: Describes event stream and recent failures list and event detail modal.
- **API Intelligence (Insights)**: Cost driver, reliability issue, slow endpoint, cost spike — with approximate thresholds and “no configuration required.”
- **Guardrails**: Cost spike (>2.5× previous period), error spike (>5%), latency spike (e.g. P95 >2s), traffic anomaly (>3× baseline).
- **Cost Estimation**: Clarified formula *(total cost in period / days in period) × 30* and where projected cost appears (overview KPI, usage card, provider/operation tables).
- **Event Schema**: Endpoint and `duration_ms` called out for operation-level analytics and latency percentiles; `model` and `provider_request_id` in metadata.
- **Limits**: Replaced vague plan names with **Free** (10k events, 2 APIs, 7d), **Pro** ($29, 100k events, 10 APIs, 90d), **Scale** ($99, 1M events, unlimited APIs, 365d) and link to Pricing.

### Alerts
- References to “Startup” plan updated to **Scale** for Slack and anomaly alerts.

### Docs intro
- Tagline updated to: *"API observability for modern SaaS: latency, failures, guardrails, and projected cost. Get your first insight in under two minutes."*

---

## 3. Files Changed

### Landing page
- `apps/web/src/app/page.tsx` — Hero, trust, problem, features (six real feature cards), how it works (4 steps, real SDK), onboarding, MCP section, pricing (Free/Pro/Scale with events and limits), use cases, final CTA.

### Pricing
- `apps/web/src/app/pricing/page.tsx` — Plans aligned with `lib/stripe.ts` (Pro $29, Scale $99), events/month and retention on each card.
- `apps/web/src/components/billing/billing-client.tsx` — Uses `PLANS.builder` / `PLANS.startup` for display names (Pro, Scale) and prices ($29, $99); helper text updated to 100k events, 10 APIs, 90-day retention.

### Docs
- `apps/web/src/app/docs/page.tsx` — New sections: Operation-Level Analytics, Event Stream & Recent Failures, API Intelligence, Guardrails; Quickstart and Cost Estimation expanded; Event schema and Limits updated; doc intro and Alerts plan names fixed.
- `apps/web/src/components/docs/docs-nav.tsx` — New items: Operation-Level Analytics, Event Stream & Recent Failures; new group *Insights & Guardrails* (API Intelligence, Guardrails).

### Shared / components
- `apps/web/src/components/landing/hero-dashboard-preview.tsx` — Guardrail-style badge (*"Cost spike · OpenAI"*) in hero preview.
- `apps/web/src/components/landing/how-it-works-code.tsx` — Replaced fake `track`/`dependwatch` with real `init` + `wrap` from `@dependwatch/sdk-node` and `estimated_cost_usd`.

---

## 4. Monetization Alignment

- **Pricing section** now clearly answers *"Why would I pay?"*:
  - **Events/month** and **retention** are visible (10k → 100k → 1M; 7d → 90d → 365d).
  - **Pro** is framed as “cost forecasting, operation-level analytics, guardrails.”
  - **Scale** is framed as “Slack, anomaly detection, long retention, team workspace.”
- **Billing UI** uses the same plan names (Pro, Scale) and prices ($29, $99) as the landing and pricing pages and as `lib/stripe.ts`.
- **Docs Limits** and **Pricing** page are consistent so trial and upgrade paths are clear.

---

## 5. Accuracy Notes (Features Discovered and Documented)

All of the following were verified in the codebase and are now reflected in the landing page and/or docs:

| Area | Source | What was documented |
|------|--------|----------------------|
| **Dashboard** | `dashboard-view.tsx`, `analytics.ts` | KPI row (total calls, avg latency, error rate, projected monthly cost), usage card (events this month, limit, projected API cost), call volume & latency charts, error spikes card, Insights (API Cost Radar), Guardrails card, event stream, by-provider table, Operations table and operation detail dialog, recent failures, ingest key reveal/copy/rotate, test-event onboarding with stream. |
| **Analytics** | `analytics.ts` | `getProjectStats`, `getProjectStatsByProvider`, `getProjectStatsByOperation`, timeseries, recent failures, error spikes, `getProjectInsights` (cost_driver, cost_driver_operation, reliability_issue, slow_endpoint, cost_spike), `getProjectGuardrails` (cost_spike, error_spike, latency_spike, traffic_anomaly), P50/P95/P99, projected monthly cost formula. |
| **Plans** | `stripe.ts` | Free (10k events, 2 providers, 7d, email), Pro/builder ($29, 100k, 10 providers, 90d, email), Scale/startup ($99, 1M, unlimited providers, 365d, email + Slack + anomaly). |
| **Usage** | `usage.ts` | `getProjectUsage`: eventsThisMonth, limit, planName, projectedApiCostMonitored, monitoredEndpoints. |
| **Ingest** | `ingest-service.ts`, `ingest-schema.ts` | Single path `ingestEventsForProject`, normalization, event fields (provider, endpoint, duration_ms, success, status_code, estimated_cost_usd, etc.), test events from UI and MCP. |
| **MCP** | README, `mcp-setup-client.tsx`, `mcp-tools.ts` | MCP tokens (workspace-scoped, hashed, shown once), tools: search_docs, list_projects, send_test_event, get_project_overview, get_latest_provider_metrics, etc.; Cursor/Claude Code config. |
| **Alerts** | `stripe.ts`, docs | Plan flags: emailAlerts (all), slackAlerts (Scale), anomalyAlerts (Scale). Alert *configuration* (latency, error rate, budget) and delivery (email; Slack on Scale) described in docs; full cron/delivery implementation is Suggested V2 in README. |

No features were invented. A few capabilities (e.g. configurable alert rules in Settings UI, cron-driven alert delivery) are documented as part of the product model where the codebase or README implies them; where implementation is not present (e.g. Slack webhook config UI), the docs do not overstate and align with README “Suggested V2.”

---

## 6. UX / Design Notes

- **Docs**: Sticky nav (`DocsNav`), existing `CodeBlock` with copy button, clear section hierarchy.
- **Landing**: Same dark/theme and typography as before; feature grid with icons; pricing cards with events/APIs/retention callouts.
- **Consistency**: Plan names (Free, Pro, Scale) and prices ($0, $29, $99) used consistently across landing, pricing page, billing client, and docs.

---

## 7. Suggested Next Steps

- Add a **pricing comparison table** (e.g. on `/pricing`) with a row per feature/limit for faster scanning.
- Implement **alert evaluation cron** and **email/Slack delivery** so the docs’ alert sections match live behavior.
- Add **Slack webhook config UI** for Scale so “Slack alerts” is configurable in-app.
- Optionally add **annual billing toggle** and **overage** semantics when you introduce usage-based billing enforcement.

This upgrade brings the landing page and documentation in line with the real product and with a path to meaningful ARR, without overclaiming or underrepresenting implemented features.
