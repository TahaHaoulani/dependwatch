# DependWatch — System Audit & Production-Grade Improvements

This document summarizes the full system audit, architectural improvements, and new capabilities implemented to elevate DependWatch to a production-grade API observability platform.

---

## 1. System Audit Summary

### Data pipeline
| Area | Finding |
|------|--------|
| **Ingest architecture** | Single shared path already in place: `ingestEventsForProject()` used by ingest API, test-events route, and MCP `send_test_event`. No duplicate logic. |
| **Event normalization** | Centralized in `normalizeToDbEvent()` with consistent field handling (provider lowercased, lengths capped, success derived from statusCode). |
| **Event schema** | Zod schema in `ingest-schema.ts`; optional fields (model, provider_request_id) added for extensibility; stored in metadata. |
| **Validation** | `batchSchema` enforces 1–100 events per request; API returns 400 with details on validation failure. |
| **Gap addressed** | Ingestion **source** attribution was missing. Added optional `source: 'sdk' \| 'ui_test' \| 'mcp'` stored in event metadata. |

### Database
| Area | Finding |
|------|--------|
| **ApiCallEvent schema** | Adequate: projectId, timestamp, provider, endpoint, durationMs, statusCode, success, errorType/Message, estimatedCostUsd, metadata, region. |
| **Indexing** | Already present: `(projectId, timestamp)`, `(projectId, provider, timestamp)`, `(projectId, success, timestamp)`, `(projectId, environment, timestamp)`. Time-range and filter queries are index-friendly. |
| **Aggregation strategy** | Real-time aggregation in application layer; no pre-aggregated tables. Acceptable for current scale; analytics layer structured so aggregation tables can be added later. |

### Analytics layer
| Area | Finding |
|------|--------|
| **Architecture** | Modular functions: `getProjectStats`, `getProjectStatsByProvider`, `getProjectTimeseries`, `getRecentFailures`, `getErrorSpikes`, `getProjectProjectedMonthlyCost`. |
| **Repeated scanning** | Each function runs its own `findMany` over the window; at high event volume consider DB-side aggregation or materialized views. Not changed to avoid overengineering. |
| **Gaps addressed** | Added `getRecentEvents()`, `getEventById()`, and `getInsights()` for event stream, event detail, and automatic insights. |

### Dashboard
| Area | Finding |
|------|--------|
| **Clarity** | KPIs, by-provider table, timeseries, and recent failures were present. Missing: automatic insights, event stream, event detail view, and clear activation moment. |
| **Preview block** | Labeled as “Preview dashboard” and “example data”; strengthened with explicit “Sample data only” badge. |
| **Real data** | When `hasData` is true, only DB-backed metrics are shown; no fake data in the live dashboard. |

### Product vs Sentry/Datadog
| Gap | Addressed |
|-----|-----------|
| No automatic insights | **Insights engine** with heuristics: high error rate, cost driver, latency spike. |
| No event-level drill-down | **Event detail view** (modal) with provider, endpoint, latency, status, error, cost. |
| No live event feed | **Event stream** showing recent API events with provider, endpoint, duration, and “Details” link. |
| Weak activation moment | **Clear success message**: “DependWatch is now monitoring your APIs” + “X test events ingested” and visible dashboard refresh. |
| Provider recognition | **Provider icons** in by-provider table, recent failures, event stream, and insights; `ProviderIcon` supports lowercase provider names. |

---

## 2. Architectural Improvements Implemented

1. **Shared ingestion with source attribution**  
   - `ingestEventsForProject(projectId, events, options?: { defaultTimestamp?, source? })`.  
   - Ingest route passes `source: 'sdk'`, test-events `source: 'ui_test'`, MCP `source: 'mcp'`.  
   - Source stored in event `metadata._source` for attribution.

2. **Event normalization and extensibility**  
   - `normalizeToDbEvent(projectId, e, defaultTimestamp, source?)` produces a single DB row; `mergeMetadata(e, source)` adds model, provider_request_id, and _source into metadata.  
   - Ingest schema: optional `model`, `provider_request_id`; type `IngestionSource` exported.

3. **Database**  
   - No schema migration; existing indexes kept. Analytics queries already use indexed columns.

4. **Analytics**  
   - New: `getRecentEvents(projectId, limit)`, `getEventById(projectId, eventId)`, `getInsights(projectId, range)`.  
   - `getInsights` returns heuristic insights: high error rate (≥10%), cost driver (≥70% of spend), slow P95 (≥3s).  
   - Top-of-file comment documents that the layer is ready for future aggregation tables.

---

## 3. Files Changed

| File | Change |
|------|--------|
| `apps/web/src/lib/ingest-schema.ts` | Optional `model`, `provider_request_id`; exported `IngestionSource`. |
| `apps/web/src/lib/ingest-service.ts` | `mergeMetadata(e, source)`; `normalizeToDbEvent(..., source?)`; `ingestEventsForProject(..., options?: { source? })`. |
| `apps/web/src/app/api/ingest/route.ts` | Pass `source: 'sdk'` to `ingestEventsForProject`. |
| `apps/web/src/app/api/projects/[projectId]/test-events/route.ts` | Pass `source: 'ui_test'`. |
| `apps/web/src/lib/mcp-tools.ts` | Pass `source: 'mcp'` for `send_test_event`. |
| `apps/web/src/lib/analytics.ts` | `getRecentEvents`, `getEventById`, `getInsights`; module comment. |
| `apps/web/src/app/api/projects/[projectId]/stats/route.ts` | Fetch `getInsights`, include `insights` in JSON. |
| `apps/web/src/app/api/projects/[projectId]/events/route.ts` | **New** GET: recent events list. |
| `apps/web/src/app/api/projects/[projectId]/events/[eventId]/route.ts` | **New** GET: single event detail. |
| `apps/web/src/components/dashboard/provider-icon.tsx` | Lowercase provider key lookup; `providerDisplayName()` export. |
| `apps/web/src/components/dashboard/dashboard-view.tsx` | Activation message; insights card; event stream card; event detail dialog; provider icons in table and failures; clickable failures; “Sample data only” badge on preview. |

---

## 4. New Capabilities Added

- **Insights engine**  
  - High error rate (e.g. “Twilio 50%”), cost driver (e.g. “OpenAI 80% of spend”), latency spike (e.g. “chat.completions P95 5.3s”).  
  - Rendered in an “Insights” card with severity (warning vs info).

- **Event detail view**  
  - User clicks a failure or “Details” on an event → modal with provider, endpoint, time, latency, status, error message, estimated cost.

- **Event stream**  
  - “Event stream” card: recent API events (provider, endpoint, duration, Details).  
  - Data from GET `/api/projects/:projectId/events?limit=20`, refetched every 15s when dashboard has data.

- **Activation moment**  
  - After “Send test event”: toast “DependWatch is now monitoring your APIs” + “X test events ingested”; banner “Test events ingested — DependWatch is now monitoring your APIs”; query invalidation so dashboard refreshes visibly.

- **Provider visuals**  
  - Provider icons in by-provider table, recent failures, event stream, and insights.  
  - `ProviderIcon` accepts lowercase provider names; `providerDisplayName()` for display.

---

## 5. Performance Improvements

- **Ingestion**  
  - Batch ingest already supported (up to 100 events per request); single `createMany` per batch.  
  - Rate limit: 300 requests per minute per project.

- **Queries**  
  - All analytics use `where: { projectId, ... }` and time or provider/success filters; existing indexes support these.  
  - `getRecentEvents` and `getRecentFailures` use `orderBy: { timestamp: 'desc' }` and `take`; index on `(projectId, timestamp)` is used.

- **Analytics structure**  
  - Clear separation of stats, by-provider, timeseries, failures, insights.  
  - Adding pre-aggregated or materialized tables later would not require changing the external API of the analytics module.

---

## 6. Event Flow Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                   INGESTION LAYER                         │
                    │  ingestEventsForProject(projectId, events, { source })   │
                    └───────────────────────────┬───────────────────────────────┘
                                              │
     ┌───────────────────────────────────────┼───────────────────────────────────────┐
     │                                       │                                       │
     ▼                                       ▼                                       ▼
┌─────────────┐                    ┌─────────────────────┐                    ┌──────────────┐
│ POST /api/  │                    │ POST /api/projects/ │                    │ MCP tool     │
│ ingest      │                    │ :id/test-events     │                    │ send_test_   │
│ (Bearer key)│                    │ (session)            │                    │ event        │
│ source: sdk │                    │ source: ui_test      │                    │ source: mcp  │
└──────┬──────┘                    └──────────┬──────────┘                    └──────┬───────┘
       │                                      │                                       │
       │  batchSchema (1–100 events)           │  getSampleTestEvents(now)             │
       │  verifyIngestKey → projectId          │  getProjectById (auth)                 │  same
       └──────────────────────────────────────┼───────────────────────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ normalizeToDbEvent  │
                                    │ mergeMetadata       │
                                    └──────────┬──────────┘
                                               │
                                               ▼
                                    ┌─────────────────────┐
                                    │ ApiCallEvent        │
                                    │ createMany          │
                                    └──────────┬──────────┘
                                               │
     ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
     │                                         │                                         │
     ▼                                         ▼                                         ▼
┌─────────────┐                    ┌─────────────────────┐                    ┌──────────────┐
│ GET /api/   │                    │ GET /api/projects/  │                    │ GET /api/    │
│ projects/   │                    │ :id/events          │                    │ projects/    │
│ :id/stats   │                    │ (recent list)       │                    │ :id/events/  │
│             │                    │ getRecentEvents     │                    │ :eventId     │
│ getProject  │                    └─────────────────────┘                    │ getEventById  │
│ Stats,      │                                                             └──────────────┘
│ ByProvider, │
│ Timeseries, │
│ Failures,   │
│ Insights    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Dashboard           │
│ (stats, insights,   │
│  event stream,      │
│  by provider,       │
│  failures → detail) │
└─────────────────────┘
```

---

## 7. Manual QA Checklist

- [ ] **Ingest**  
  - [ ] POST `/api/ingest` with valid Bearer key and body `{ events: [ { provider: "openai", endpoint: "test" } ] }` returns 200 and event appears in DB.  
  - [ ] Invalid key returns 401.  
  - [ ] Invalid payload (e.g. missing provider) returns 400 with details.

- [ ] **Test events**  
  - [ ] From dashboard empty state, “Send a test event” creates 10 events and shows toast “DependWatch is now monitoring your APIs”.  
  - [ ] Dashboard refreshes and shows KPIs, by-provider, event stream, and recent failures.  
  - [ ] Banner “Test events ingested — DependWatch is now monitoring your APIs” appears when first data arrives.

- [ ] **Preview block**  
  - [ ] When there are no events, preview card shows “Preview dashboard” and “Sample data only” badge.  
  - [ ] When there are events, preview block is not shown; only real metrics are shown.

- [ ] **Insights**  
  - [ ] With test data (e.g. Twilio failure, OpenAI cost), Insights card shows at least one insight (e.g. high error rate or cost driver).  
  - [ ] Severity and icons correct (warning vs info).

- [ ] **Event stream**  
  - [ ] “Event stream” card lists recent events with provider, endpoint, duration, and “Details”.  
  - [ ] “Details” opens modal with full event detail.

- [ ] **Event detail**  
  - [ ] Clicking a recent failure opens modal with provider, endpoint, time, latency, status, error message, cost when present.  
  - [ ] Closing modal clears selection.

- [ ] **Provider icons**  
  - [ ] By-provider table shows provider icon and display name (e.g. “Openai” → “Openai” with icon).  
  - [ ] Recent failures and event stream show provider icons.

- [ ] **MCP**  
  - [ ] `send_test_event` with valid projectId creates events and returns success; dashboard shows new events.

---

## 8. Final Assessment of DependWatch Maturity

| Dimension | Before | After |
|-----------|--------|--------|
| **Data pipeline** | Single path, no source attribution | Single path with source (sdk / ui_test / mcp) and extensible metadata. |
| **Event model** | Fixed set of fields | Optional model, provider_request_id; normalization and validation consistent. |
| **Analytics** | Stats, by-provider, timeseries, failures, error spikes | Same plus insights, recent events, and event-by-id; layer ready for future aggregation. |
| **Dashboard** | KPIs + charts + table + failures | Adds insights, event stream, event detail modal, clear activation, provider icons, and explicit sample-data labeling. |
| **Developer UX** | Functional onboarding | Clear “monitoring your APIs” moment, drill-down into failures, and live event feed. |
| **Credibility** | Risk of confusion between sample and real data | Preview clearly “Sample data only”; live view is 100% DB-backed. |

**Summary:** DependWatch now has a single, traceable ingestion path, a richer event model, an insights engine, event-level visibility (stream + detail), and a clearer activation and data-provenance story. The architecture remains simple (no queues or streaming infra), uses existing indexes, and is prepared for higher volume (batch ingest, clean analytics boundary). It is in a strong position to be used as a credible API observability devtool in production and to support a path toward a more scalable, revenue-ready product.
