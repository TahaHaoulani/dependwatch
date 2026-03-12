# DependWatch — Product Pillars Implementation

This document summarizes the three major product pillars, onboarding flow, viral feature, usage-based pricing, and technical improvements implemented to position DependWatch as a best-of-breed developer platform.

---

## 1. Product Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDWATCH PLATFORM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  ONBOARDING              │  VIRAL FEATURE           │  METERING              │
│  • Auto-create project   │  • API Cost Radar        │  • Events/month        │
│  • Visible ingestion     │  • Cost spike detection  │  • Plan limits         │
│  • Next-step CTA         │  • Insights panel        │  • Usage card          │
│  • Real-time refetch     │                          │  • Billing-ready       │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │ Ingest API   │    │ Analytics    │    │ Usage        │
            │ (single path)│    │ (stats,      │    │ (per project │
            │ SDK / UI /   │    │  insights,   │    │  per month)  │
            │ MCP          │    │  failures)   │    │              │
            └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
                   │                   │                   │
                   └───────────────────┼───────────────────┘
                                       ▼
                            ┌──────────────────────┐
                            │ ApiCallEvent         │
                            │ (indexed: projectId, │
                            │  timestamp, provider)│
                            └──────────────────────┘
```

- **Single ingestion path**: SDK (`/api/ingest`), UI test events (`/api/projects/:id/test-events`), and MCP `send_test_event` all use `ingestEventsForProject()` with the same normalization.
- **Analytics**: Stats, by-provider, timeseries, failures, and insights (including cost spike) are computed from `ApiCallEvent` with indexed queries.
- **Usage**: Events per calendar month per project; plan limits from workspace subscription; projected API cost from analytics.

---

## 2. New Onboarding Flow

### Step 1 — Create project automatically

- When the user first enters the dashboard (e.g. `/dashboard/[workspaceId]` or onboarding with workspace but no project), the app **ensures a project exists**.
- **Implementation**: `ensureDefaultProject(workspaceId, userId)` in `lib/project.ts` creates a project named "My Project" (with default ingest key) if the workspace has zero projects. The workspace dashboard page and the onboarding page (when user has a workspace but no projects) use this so the user is always redirected to a project dashboard.

### Step 2 — Test events with visible ingestion

- When the user clicks **"Send a test event"**:
  1. A **temporary ingestion stream** appears, showing lines like:
     - `openai chat.completions 2.1s`
     - `stripe customers.create 450ms`
     - … (10 lines, matching the sample events)
  2. Lines appear one-by-one (~140ms apart), then the app calls `POST /api/projects/:id/test-events`.
  3. After success, a **success banner** shows: **"10 events ingested. DependWatch is now monitoring your APIs."**
  4. Dashboard data is invalidated and refetched so metrics update.

### Step 3 — Clear next action

- Right after the success banner, a **"Next step: monitor your real APIs"** card is shown with:
  1. **Install SDK** — `npm install @dependwatch/sdk-node`
  2. **Add DEPENDWATCH_INGEST_KEY** to your environment
  3. **Wrap your API calls** with `wrap()`
- A link to **Setup docs** is included.

### Step 4 — Real-time feedback

- When the dashboard has data:
  - **Stats** refetch every **30 seconds** so KPIs and charts update as SDK events arrive.
  - **Event stream** refetches every **15 seconds** so new events appear in "Event stream."
- All dashboard data is **DB-backed** (no mocked data when `hasData` is true).

---

## 3. New Viral Features (API Cost Radar)

### Insights panel — "API Cost Radar"

- **Location**: Dashboard card titled **"API Cost Radar"** with description: *Auto-detected: cost drivers, error rates, slow endpoints, cost spikes*.
- **Computed automatically** from existing analytics:

| Insight type      | Condition (heuristic) | Example output |
|-------------------|------------------------|----------------|
| High error rate   | Provider error rate ≥ 10% (and ≥ 5 calls) | ⚠ High error rate: Twilio — 50% of twilio calls failed |
| Cost driver       | Provider accounts for ≥ 70% of spend      | 💸 Cost driver: OpenAI — accounts for 83% of projected spend |
| Slow endpoint     | Provider P95 latency ≥ 3s (and ≥ 10 calls) | 🐢 Slow endpoint: openai — P95 5.3s |
| Cost spike        | Current period cost > previous period by ≥ 50% | 🚨 Cost spike detected — Usage +180% compared to previous period |

- Insights appear as soon as test events (or any events) are present and conditions are met.

### Cost spike detection

- **Logic**: For the selected range (e.g. 7d), the app compares **current window** total cost to **previous window** (same length, immediately before). If current cost ≥ previous × 1.5 and previous > 0, a **cost_spike** insight is added.
- **Implementation**: `getInsights()` in `lib/analytics.ts` uses `getProjectStatsForWindow(projectId, fromPrev, toPrev)` for the previous period and pushes an insight when the threshold is exceeded.

---

## 4. Pricing / Metering System Implemented

### Plan structure (usage-based)

| Tier        | Price   | Events/month | Notes        |
|------------|---------|----------------|-------------|
| Free       | $0      | 10,000         | Default     |
| Pro        | $29/mo  | 100,000        | planId: builder |
| Scale      | $99/mo  | 1,000,000      | planId: startup |
| Enterprise | Custom  | Custom         | Not in app yet |

- **PLANS** in `lib/stripe.ts` include `eventsPerMonth`; `getPlanLimits(planId)` returns `eventsPerMonth` for the usage card and future billing.

### Internal metering logic

- **Events this month**: Count of `ApiCallEvent` for the project where `timestamp` is in the **current calendar month** (indexed by `projectId`, `timestamp`).
- **Monitored endpoints**: Count of distinct `(provider, endpoint)` in the same month (for future use).
- **Projected API cost monitored**: From existing `getProjectProjectedMonthlyCost(projectId, range)` (e.g. 7d).

### Data structures for billing

- **Project usage**: `getProjectUsage(projectId, userId)` in `lib/usage.ts` returns:
  - `eventsThisMonth`, `limit`, `planId`, `planName`, `projectedApiCostMonitored`, `monitoredEndpoints`.
- **API**: `GET /api/projects/:projectId/usage` returns this object for the dashboard and for future billing/checkout.

### Usage in dashboard

- When the dashboard has data, a **"Usage this month"** card shows:
  - **Events**: `12,430 / 100k` (or `1M` for Scale).
  - **Projected API cost monitored**: e.g. `$4,120`.
  - Plan name and a link to **Billing & plans**.

---

## 5. Database and Performance Improvements

- **Indexes** (already in place, verified):
  - `(projectId, timestamp)` — time-range and “recent events” queries.
  - `(projectId, provider, timestamp)` — provider breakdown and filtered analytics.
  - `(projectId, success, timestamp)` — recent failures.
  - `(projectId, environment, timestamp)` — environment filtering.

- **No full table scans**: All analytics and usage queries filter by `projectId` (and optionally timestamp range) so the planner can use these indexes.

- **Analytics reuse**: `getProjectStatsForWindow(projectId, from, to)` centralizes windowed stats and is used for both the main range and the previous-period window in cost spike detection.

---

## 6. Files Changed

| Area | File | Change |
|------|------|--------|
| **Onboarding** | `apps/web/src/lib/project.ts` | Added `ensureDefaultProject(workspaceId, userId)`. |
| | `apps/web/src/app/dashboard/[workspaceId]/page.tsx` | Use `ensureDefaultProject` and redirect to project (no redirect to onboarding when 0 projects). |
| | `apps/web/src/app/onboarding/page.tsx` | When workspace exists but no projects, redirect to `/dashboard/[workspaceId]` (project auto-created there). |
| **Ingestion stream & CTA** | `apps/web/src/components/dashboard/dashboard-view.tsx` | `INGESTION_STREAM_PREVIEW`, `streamPhase` / `streamVisibleCount` state; stream UI; success banner; "Next step: monitor your real APIs" card; refetch intervals (30s stats, 15s events when hasData). |
| **Insights & cost spike** | `apps/web/src/lib/analytics.ts` | `getProjectStatsForWindow()`; `getInsights()` extended with previous-period comparison and `cost_spike` insight type. |
| | `apps/web/src/components/dashboard/dashboard-view.tsx` | Insights card titled "API Cost Radar"; cost_spike icon (TrendingUp). |
| **Metering** | `apps/web/src/lib/stripe.ts` | `eventsPerMonth` and display names (Pro, Scale) in PLANS; `getPlanLimits()` returns `eventsPerMonth`. |
| | `apps/web/src/lib/usage.ts` | **New**: `getProjectUsage(projectId, userId)` — events this month, limit, plan, projected cost, monitored endpoints. |
| | `apps/web/src/app/api/projects/[projectId]/usage/route.ts` | **New**: GET usage for project. |
| | `apps/web/src/components/dashboard/dashboard-view.tsx` | Usage `useQuery`; "Usage this month" card (events, projected cost, plan, link to billing). |

---

## 7. Manual QA Checklist

### Onboarding

- [ ] New user: sign up → create workspace (or use onboarding) → land on `/dashboard/[workspaceId]` with one project ("My Project") and see project dashboard.
- [ ] Workspace with no projects: go to `/onboarding` → redirect to `/dashboard/[workspaceId]` and see project dashboard (project auto-created).

### Test events and stream

- [ ] From empty dashboard, click **"Send a test event"** → ingestion stream appears with 10 lines (openai, stripe, twilio, resend, etc.) appearing one-by-one.
- [ ] After stream completes, **"10 events ingested. DependWatch is now monitoring your APIs."** banner appears; **"Next step: monitor your real APIs"** card with Install SDK, Add key, Wrap calls is visible.
- [ ] Dashboard refreshes and shows KPIs, event stream, by-provider, and (when conditions met) insights.

### API Cost Radar

- [ ] After test events, **API Cost Radar** card appears with at least one insight (e.g. high error rate for Twilio, cost driver for OpenAI).
- [ ] When current-period cost is >50% higher than previous period, a **Cost spike detected** insight appears.

### Usage and metering

- [ ] With data, **Usage this month** card shows: Events X / limit (e.g. 10 / 10k for free), Projected API cost monitored, plan name, link to Billing.
- [ ] `GET /api/projects/:id/usage` returns `eventsThisMonth`, `limit`, `planId`, `planName`, `projectedApiCostMonitored`.

### Real-time and data integrity

- [ ] With dashboard loaded and hasData, wait 15–30s: event stream and stats can update (periodic refetch).
- [ ] No fake data when `hasData`: all numbers come from DB.
- [ ] Preview block (empty state) remains clearly labeled **"Sample data only"**.

### Technical

- [ ] Sending test events from UI and from MCP `send_test_event` both persist via same `ingestEventsForProject` and show in dashboard.
- [ ] All event creation paths use the same ingestion service and normalization.

---

## Operation-level observability

DependWatch has been extended from **provider-level** to **operation-level** observability: the system tracks and surfaces the most important external API operations/endpoints, not just providers.

### Definitions

- **Operation**: `provider` + `endpoint` (e.g. `openai.chat.completions`). When `endpoint` is null, the operation is provider-only (e.g. `openai`).
- **Per-operation metrics**: calls, p50/p95/p99 latency, error rate, projected cost — all computed from `ApiCallEvent` by grouping on `(provider, endpoint)`.

### Files changed

| Area | Files |
|------|--------|
| **Analytics** | `apps/web/src/lib/analytics.ts` — operation helpers, `OperationRow`, `getProjectStatsByOperation`, `getTopSlowOperations`, `getTopCostlyOperations`, `getTopFailingOperations`, `getOperationTimeseries`, `getOperationRecentFailures`; `ProjectInsight` extended with `cost_driver_operation`; `getProjectInsights` uses `byOperation` for cost-driver operation. |
| **API** | `apps/web/src/app/api/projects/[projectId]/stats/route.ts` — returns `byOperation`; `apps/web/src/app/api/projects/[projectId]/operations/detail/route.ts` (new) — GET `?provider=&endpoint=&range=` returns stats, timeseries, recent failures, latency distribution. |
| **Dashboard** | `apps/web/src/components/dashboard/dashboard-view.tsx` — Operations table (operation, provider, calls, P95, error rate, cost); operation detail Dialog (timeseries, cost trend, recent failures, latency distribution); Insights/Guardrails use `operationLabel(provider, endpoint)` for operation-level copy (e.g. "openai.chat.completions", "Twilio messages.create error spike"). |

### New analytics functions

- **`getProjectStatsByOperation(projectId, range)`** — Aggregates by `(provider, endpoint)`; returns `OperationRow[]` with calls, errors, errorRate, avgLatencyMs, p50/p95/p99, costUsd.
- **`getTopSlowOperations(projectId, range, limit)`** — From by-operation, min 3 calls, sorted by p95 desc.
- **`getTopCostlyOperations(projectId, range, limit)`** — Sorted by costUsd desc.
- **`getTopFailingOperations(projectId, range, limit)`** — Min 5 calls, sorted by errorRate desc.
- **`getOperationTimeseries(projectId, provider, endpoint, range, groupBy)`** — Time buckets for one operation (calls, errors, avgLatencyMs, costUsd).
- **`getOperationRecentFailures(projectId, provider, endpoint, limit)`** — Recent failed events for one operation.
- **`operationLabel(provider, endpoint)`** — Display label: `provider.endpoint` or `provider` when endpoint is null.

### New UI sections

- **Operations card** — Table: Operation (font-mono), Provider (with icon), Calls, P95 latency, Error rate, Projected cost. Rows are clickable.
- **Operation detail Dialog** — Opens when a row is clicked. Shows: stats (calls, error rate, P95, cost), latency distribution (P50/P95/P99), calls-over-time bar chart, cost trend line chart, recent failures list.

### Insights and Guardrails (operation-level)

- **Cost driver** — When the top cost is from an operation with an endpoint, insight type `cost_driver_operation` shows e.g. "Cost driver: openai.chat.completions accounts for 83% of projected spend."
- **Reliability / error spike** — Copy uses operation label: e.g. "Twilio messages.create error spike", "openai.chat.completions reliability issue."
- **Slow endpoint** — Copy uses operation label: e.g. "openai.chat.completions P95 latency is 2.1s."

### How it works

1. **Ingest**: Events include optional `endpoint` (max 256 chars); ingest normalizes and stores `provider` + `endpoint` on `ApiCallEvent`. No schema change beyond existing columns.
2. **Stats API**: `/api/projects/:id/stats?range=` returns `byOperation` (and existing byProvider, timeseries, etc.). Dashboard uses `byOperation` for the Operations table.
3. **Detail API**: `/api/projects/:id/operations/detail?provider=&endpoint=&range=` returns one operation’s stats, timeseries, recent failures, and latency distribution. Used when the user clicks an operation row.
4. **Insights/Guardrails**: `getProjectInsights` and `getProjectGuardrails` already had endpoint in several types; they now feed operation-level copy in the UI via `operationLabel(provider, endpoint)`, and a new `cost_driver_operation` insight surfaces the top costly operation by name.

Architecture stays simple: same `ApiCallEvent` table and analytics layer; no new infra or redesign of unrelated areas.

---

## Summary

- **Onboarding**: Project is auto-created when entering the dashboard; test events show a visible ingestion stream and a clear success + next-step CTA; stats and event stream refetch periodically for real-time feedback.
- **Viral feature**: **API Cost Radar** insights panel with high error rate, cost driver, slow endpoint, and **cost spike detection** (current vs previous period), all computed from existing analytics.
- **Usage-based pricing**: Events-per-month metering per project, plan limits (Free 10k, Pro 100k, Scale 1M), usage API and dashboard card; structure in place for billing.
- **Dashboard**: KPI row, event stream, provider breakdown, API Cost Radar, recent failures, usage card; all DB-backed; preview block labeled as sample data.
- **Technical**: Single ingestion path, shared normalization, indexed queries; no full table scans; analytics and usage ready for scale.

DependWatch is positioned as a credible, production-ready API observability platform with fast onboarding, shareable insights, and usage-based value alignment.
