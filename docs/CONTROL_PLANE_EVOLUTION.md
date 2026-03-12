# DependWatch: External API Control Plane — Evolution Summary

This document summarizes the product evolution from "external API observability dashboard" to **External API Control Plane**: observability + intelligence + control. It also notes what is fully implemented, what is foundation/preview, and what is not claimed.

---

## 1. Product architecture changes

### Observability layer
- **Existing and unchanged in behavior:** Event ingestion (single path: ingest API, test events, MCP), provider-level and operation-level stats, timeseries, recent failures, event stream, projected monthly cost, error spikes. All backed by `ApiCallEvent` and analytics functions in `lib/analytics.ts`.
- **Plan gating:** Free = provider-level only; Pro/Scale = operation-level analytics, longer retention. Retention and max providers enforced via `getPlanLimits()`.

### Intelligence layer
- **New module:** `lib/intelligence.ts` — API Intelligence surface:
  - `getTopCostDrivers()` — Top cost drivers by provider (share of spend).
  - Re-exports: `getTopSlowOperations`, `getTopCostlyOperations`, `getTopFailingOperations` from analytics.
  - `getReliabilityIssues()` — From `getProjectInsights()` (reliability_issue type).
  - `getCostAnomalies()` — From guardrails (cost_spike).
  - `getTrafficAnomalies()` — From guardrails (traffic_anomaly).
- **Existing:** `getInsights()`, `getProjectInsights()`, `getProjectGuardrails()` in analytics already power the dashboard. No manual dashboards required for value.

### Control / protection layer
- **New data model:** `ApiPolicy` in Prisma (projectId, type: retry | fallback | guardrail, name, enabled, config Json). Migration: `20250307140000_add_api_policy`.
- **Product surface:** Dashboard has a **Protection** card that states guardrails surface anomalies and docs describe retry/fallback/circuit-breaker patterns; policy config is stored for a future runtime layer. **No runtime enforcement is implemented or claimed.**
- **Honest positioning:** Docs say "Runtime control is a roadmap direction" and "DependWatch does not yet enforce these policies at runtime."

### Dependency graph / reliability map
- **New in analytics:** `getProjectDependencyMap(projectId, range, retentionDays)` returns `{ providers, operations }` with calls, errorRate, p50/p95, costUsd, reliabilityScore (1 − errorRate).
- **Plan gating:** `dependencyGraph` in `getPlanLimits()` — true for Pro and Scale, false for Free. Stats API returns `dependencyMap` and `planLimits` only when plan allows.
- **Dashboard:** New **Dependency map** card (Pro/Scale) with table: provider, calls, reliability %, P95, cost. Free users see an upgrade CTA for dependency map.

---

## 2. Dashboard / product changes

- **Stats API:** Now returns `dependencyMap` (when plan allows) and `planLimits: { dependencyGraph, operationAnalytics, apiIntelligence }`.
- **Dashboard:**
  - **Dependency map** card: Shows providers with calls, reliability score, P95, cost when `planLimits.dependencyGraph` is true; otherwise upgrade CTA.
  - **Protection** card: Explains guardrails + docs for retry/fallback; links to `/docs#control-protection`. No fake runtime protection.
- **Incidents:** Share incident and Create GitHub issue buttons on guardrails unchanged; public incident report pages and shareable links already in place.

---

## 3. Landing page changes

- **Hero:** Tagline "The control plane for external APIs." Headline: "One place to see and protect every API your product calls." Subhead: built for the dependency layer, per-provider/operation, auto-detected anomalies and dependency map — not generic APM. No "path to runtime protection" (removed to avoid overclaim). Comparison section defines control plane: visibility and signals, not runtime enforcement.
- **Features section:** Retitled to "Platform" and "Observability, intelligence, and control in one place." Two new cards: **Dependency map** (Pro+) and **Protection in code, visibility here** (guardrails surface anomalies; retries/fallbacks live in your code; we monitor, you enforce). No claim that policy config is stored or that we enforce at runtime.
- **Comparison section:** Copy updated to "DependWatch is the control plane for the dependency layer..."
- **Pricing section:** Feature lists updated to include dependency map and API Intelligence where applicable; upgrade triggers aligned.

---

## 4. Pricing changes

- **Stripe (lib/stripe.ts):** Added to each plan: `operationAnalytics`, `apiIntelligence`, `dependencyGraph` (all false for free; true for builder/startup for all three).
- **Pricing page:** Comparison table updated: dependency map row, API Intelligence row, clearer operation-level and guardrails rows. Plan feature lists updated to match.
- **Landing pricing block:** Free/Pro/Scale feature bullets updated; no new plans or prices.

---

## 5. Documentation changes

- **Docs nav:** New groups **Dependency Graph** (Dependency Map, Reliability & Cost per Provider) and **Control & Protection** (Control & Protection (Foundation), Retry & Fallback Patterns).
- **New sections:**
  - **Dependency Map** — Pro/Scale; describes dependency map view and what it shows.
  - **Reliability & Cost per Provider** — How reliability score and cost are computed.
  - **Control & Protection (Foundation)** — States observability and intelligence are live; runtime control is roadmap; policy config stored for future.
  - **Retry & Fallback Patterns** — Retry with backoff, fallback, circuit breaker; implement in code; use dashboard to monitor. Explicit: "DependWatch does not yet enforce these policies at runtime."
- **Docs intro:** Updated to "The control plane for external APIs: observability, API Intelligence, guardrails, dependency map, and a foundation for protection."

---

## 6. Trustworthiness notes

### Fully real (implemented and safe to claim)
- Observability: ingestion, provider/operation stats, timeseries, recent failures, event stream, projected cost, error spikes.
- API Intelligence: insights (cost driver, reliability issue, slow endpoint, cost spike), project insights, guardrails (cost/error/latency/traffic anomalies). Plan-gated (Pro/Scale for insights and guardrails).
- Dependency map: provider (and operation) list with calls, reliability score, P95, cost. Plan-gated (Pro/Scale).
- Shareable incident reports and GitHub issue markdown from guardrails.
- MCP / coding assistant integration (docs, projects, test events).

### Foundation / preview (implemented but not overclaimed)
- **ApiPolicy** model and migration: config storage for retry/fallback/guardrail. No runtime enforcement. Dashboard and docs describe it as foundation and roadmap.
- **Protection** card and **Control & protection** docs: Retry/fallback/circuit-breaker patterns documented as "implement in your app"; DependWatch monitors and alerts.

### Not claimed
- Runtime retry/fallback/circuit-breaker enforcement by DependWatch.
- "Control plane" is defined on the landing page as: one place to see and act on every external dependency — visibility and signals, not runtime enforcement (that’s in your code). Docs state explicitly: "We do not run or enforce retry, fallback, or circuit-breaker logic in your request path."

---

## 7. Files changed (grouped)

### Product / backend
- `apps/web/prisma/schema.prisma` — IncidentReport (existing), ApiPolicy added; Project relation to ApiPolicy and IncidentReport.
- `apps/web/prisma/migrations/20250307120000_add_incident_report/migration.sql` — (existing)
- `apps/web/prisma/migrations/20250307140000_add_api_policy/migration.sql` — New.
- `apps/web/src/lib/analytics.ts` — `getProjectDependencyMap()`, types `DependencyMapProvider`, `DependencyMapOperation`.
- `apps/web/src/lib/intelligence.ts` — New; API Intelligence module.
- `apps/web/src/lib/stripe.ts` — `operationAnalytics`, `apiIntelligence`, `dependencyGraph` on PLANS and getPlanLimits().
- `apps/web/src/app/api/projects/[projectId]/stats/route.ts` — Fetches dependency map when plan allows; returns `dependencyMap`, `planLimits`.

### Dashboard / frontend
- `apps/web/src/components/dashboard/dashboard-view.tsx` — Destructure `dependencyMap`, `planLimits`; Dependency map card (Pro+); upgrade CTA for Free; Protection card with link to docs.

### Landing / marketing
- `apps/web/src/app/page.tsx` — Hero (control plane, observability + intelligence + control); features section title and copy; Dependency map and Protection foundation cards; comparison copy; pricing feature lists.

### Pricing
- `apps/web/src/app/pricing/page.tsx` — Comparison table rows (dependency map, API Intelligence, etc.); plan feature lists updated.

### Documentation
- `apps/web/src/components/docs/docs-nav.tsx` — Dependency Graph and Control & Protection groups and items.
- `apps/web/src/app/docs/page.tsx` — Doc sections: dependency-graph, reliability-map, control-protection, retry-fallback; docs intro paragraph.

### Docs (reference)
- `docs/CONTROL_PLANE_EVOLUTION.md` — This file.

---

## Running migrations

After pulling, run:

```bash
cd apps/web && npx prisma generate && npx prisma migrate deploy
```

If you already applied the IncidentReport migration, only the ApiPolicy migration will run.
