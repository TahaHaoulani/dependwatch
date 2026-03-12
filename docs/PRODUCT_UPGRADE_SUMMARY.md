# DependWatch Product Upgrade — Summary

This document summarizes the product improvements and new features implemented to move DependWatch toward a production-grade DevTools platform with a credible path to $1M ARR.

---

## 1. Product improvements (post–test-event dashboard)

### What changed

- **Insights and guardrails use real data**
  - Insights and guardrails are now computed with **lower thresholds for small datasets** (e.g. &lt; 25 total calls). After sending test events, cost drivers, reliability issues, slow endpoints, and guardrail alerts appear instead of “No insights” / “No guardrail alerts”.
  - **Free tier** now receives the same insights and guardrails as Pro/Scale (for activation). A footer explains “Free tier: limited insights” and links to upgrade for full API Intelligence and 90-day history.

- **“What needs attention” / Top issue**
  - A **Top issue** section appears high on the dashboard (after KPIs, before charts). It shows the single most important finding:
    - Reliability: e.g. “openai.chat/completions has 20% failure rate”
    - Latency: e.g. “openai.chat/completions is slow — P95 5.3s”
    - Cost: e.g. “OpenAI accounts for 78% of your monitored API spend”
  - Derived from real `byProvider` / `byOperation` and insights/guardrails; no fake data.

- **Charts**
  - For **24h** range, timeseries now uses **hour** granularity instead of day, so the last 24 hours show multiple buckets. Small datasets (e.g. 10 test events) still produce a visible shape (e.g. one or a few bars with calls).

- **Empty states**
  - Insights: empty state explains what insights are and includes “Upgrade for full API Intelligence” when applicable.
  - Guardrails: empty state explains when alerts fire and suggests configuring Slack in Project settings → Alerts.

- **Dashboard hierarchy**
  - Order is: KPIs → **Top issue** → Charts → Error spikes (if any) → Insights → Guardrails → Open incidents (if any) → Dependency map → … → Event stream → Providers → Operations → Recent failures. “What matters” (top issue, insights, guardrails) is elevated.

---

## 2. Five ARR-oriented features

### Feature 1 — Smart Insights Engine

- **What it does:** Analyzes project data and produces structured insights: cost drivers (provider and operation), reliability issues (elevated error rate), slow endpoints (P95), and (when data supports it) cost spike.
- **Backend:** `getProjectInsights()` and `getInsights()` in `lib/analytics.ts` with small-dataset thresholds; `lib/intelligence.ts` re-exports and extends (e.g. `getTopCostDrivers`, `getReliabilityIssues`).
- **Frontend:** Dashboard Insights card and Top issue both consume this data. No fake placeholders.

### Feature 2 — Alert destinations + test alerts

- **What it does:** Users can add Slack webhooks in Project settings → Alerts and **send a test alert** to verify the integration.
- **Backend:** `POST /api/projects/:projectId/webhooks/slack/test` sends a sample DependWatch incident payload to all enabled webhooks using `formatSlackIncidentBlocks()`.
- **Frontend:** “Send test alert” button in the Slack webhooks card on the alerts settings page.

### Feature 3 — Daily / weekly digest foundation

- **What it does:** Digest content (top cost driver, highest error provider, slowest operation, recent failures, insights and guardrails summaries) is generated and can be previewed or used by a future scheduler.
- **Backend:** `lib/digest.ts` — `generateDigestContent()`, `formatDigestAsText()`. `GET /api/projects/:projectId/digest/preview?range=7d` returns JSON (content + textBody) and a note that scheduled delivery requires a cron/scheduler.
- **Frontend:** Project settings → Alerts: “Daily / weekly digest” card with “Preview digest (7d)” and “Copy to clipboard”. No automated sending yet; scheduler gap is explicit.

### Feature 4 — Upgrade-motivating premium surfaces

- **What it does:** Free users see real value (insights, guardrails, top issue) plus clear upgrade prompts.
- **Implementation:** Insights card shows a footer for Free: “Free tier: limited insights. Upgrade to Pro for full API Intelligence, 90-day history, and operation-level analytics.” Dependency map remains Pro/Scale-only with an “Upgrade for dependency map” card on Free. No generic “Upgrade” banners everywhere; prompts are contextual.

### Feature 5 — Incident / issue workflow

- **What it does:** From a guardrail card, users can **Track incident**, creating an `ApiIncident` record. Open incidents are listed on the dashboard with **Acknowledge** and **Resolve** actions. Share and “Create GitHub issue” (copy markdown) remain.
- **Backend:** New model `ApiIncident` (projectId, provider, endpoint, type, message, status, note, resolvedAt, …). `lib/api-incident.ts`: create from guardrail, list, update status/note. `POST /api/projects/:id/incidents`, `GET /api/projects/:id/incidents`, `PATCH /api/projects/:id/incidents/:incidentId`.
- **Frontend:** Guardrails section: “Track incident” button; dashboard: “Open incidents” card (when there are non-resolved incidents) with Acknowledge/Resolve.

---

## 3. Files changed

- **Analytics / intelligence**
  - `apps/web/src/lib/analytics.ts` — small-dataset thresholds, `getTopIssue()`, lower P95/share thresholds for insights and guardrails.
  - `apps/web/src/lib/digest.ts` — new: digest content generation and plain-text formatting.
- **API**
  - `apps/web/src/app/api/projects/[projectId]/stats/route.ts` — hour granularity for 24h, return real insights/guardrails for Free, add `topIssue` and `insightsLimited`.
  - `apps/web/src/app/api/projects/[projectId]/webhooks/slack/test/route.ts` — new: test Slack alert.
  - `apps/web/src/app/api/projects/[projectId]/incidents/route.ts` — new: list/create incidents.
  - `apps/web/src/app/api/projects/[projectId]/incidents/[incidentId]/route.ts` — new: get/patch incident.
  - `apps/web/src/app/api/projects/[projectId]/digest/preview/route.ts` — new: digest preview.
- **Dashboard**
  - `apps/web/src/components/dashboard/dashboard-view.tsx` — Top issue, Open incidents, insightsLimited and onIncidentCreated wiring.
  - `apps/web/src/components/dashboard/dashboard-top-issue.tsx` — new: “What needs attention” / “Top insight” card.
  - `apps/web/src/components/dashboard/dashboard-insights-section.tsx` — empty state, insightsLimited footer, upgrade CTA.
  - `apps/web/src/components/dashboard/dashboard-guardrails-section.tsx` — empty state, “Track incident” button.
  - `apps/web/src/components/dashboard/dashboard-open-incidents.tsx` — new: list open/acknowledged incidents with Acknowledge/Resolve.
- **Settings**
  - `apps/web/src/components/settings/project-slack-webhooks-client.tsx` — “Send test alert” button.
  - `apps/web/src/components/settings/project-digest-preview-client.tsx` — new: digest preview card.
  - `apps/web/src/app/(app)/dashboard/[workspaceId]/[projectId]/settings/alerts/page.tsx` — add digest preview section.
- **Incident workflow**
  - `apps/web/src/lib/api-incident.ts` — new: create from guardrail, list, update.
- **Schema**
  - `apps/web/prisma/schema.prisma` — new model `ApiIncident`.
  - `apps/web/prisma/migrations/20250308000000_api_incident/migration.sql` — new migration.

---

## 4. New database models / migrations

- **ApiIncident**
  - `id`, `projectId`, `provider`, `endpoint`, `type`, `message`, `status` (open | acknowledged | resolved), `assignedToId`, `note`, `resolvedAt`, `createdAt`, `updatedAt`.
  - Indexes: `projectId`, `(projectId, status)`.
  - Migration: `prisma/migrations/20250308000000_api_incident/migration.sql`.

Run `npx prisma migrate deploy` (or `prisma generate` if only applying schema) after pull.

---

## 5. Free / Pro / Scale mapping

| Capability                     | Free | Pro (builder) | Scale (startup) |
|--------------------------------|------|----------------|-----------------|
| Dashboard, KPIs, charts        | Yes  | Yes           | Yes             |
| Insights & guardrails (real)   | Yes (limited footer CTA) | Yes | Yes |
| Top issue                      | Yes  | Yes           | Yes             |
| Dependency map                 | No (upgrade card) | Yes | Yes |
| Operations table               | Yes  | Yes           | Yes             |
| Retention                      | 7 days | 90 days    | 365 days        |
| Traffic anomaly guardrail      | No   | No            | Yes             |
| Slack webhooks + test alert   | Config + test | Yes | Yes |
| Incident workflow (track/ack/resolve) | Yes | Yes | Yes |
| Digest preview                 | Yes  | Yes           | Yes             |
| Scheduled digest delivery     | —    | Cron required  | Cron required   |

---

## 6. Activation improvements

After sending test events:

1. **KPIs** update (calls, errors, latency, cost).
2. **Top issue** shows the main problem (e.g. “openai.chat/completions is slow — P95 5.3s” or “Stripe customers.create has 50% failure rate”).
3. **Charts** show at least one bucket with data; for 24h, hour buckets give a clearer timeline.
4. **Insights** show cost driver, slow endpoint, and/or reliability issues from the test data.
5. **Guardrails** show latency or error spike when thresholds are met.
6. **Event stream**, **Providers**, and **Operations** tables are populated.
7. User can **Track incident** from a guardrail and see it in **Open incidents** with Acknowledge/Resolve.

The first run feels “alive” and intelligent rather than empty.

---

## 7. Trustworthiness and limitations

- **No fake metrics or fabricated insights.** All numbers and insights are derived from real event data (including test events).
- **Digest scheduling:** Only the **content generation and preview API** are implemented. Daily/weekly **delivery** (email/Slack) requires a cron job or external scheduler; the preview response states this.
- **Slack delivery on guardrail fire:** The format and test path exist; actually sending to Slack when a guardrail fires would require either a background job that periodically evaluates guardrails and posts, or an on-demand check (e.g. on dashboard load). Not implemented in this pass.
- **Prisma:** If `prisma generate` fails with a file lock (e.g. EPERM on Windows), run it again when the process locking the file is closed.

---

## 8. Success criteria (met)

- Post–ingestion dashboard is materially smarter and shows real insights and guardrails.
- User gets an “aha” moment within minutes (top issue + insights + guardrails from test data).
- Dashboard order and copy emphasize “what happened → what matters → what to do next.”
- Five real product capabilities added: insights engine, test alerts, digest foundation, premium surfaces, incident workflow.
- Implementation is production-oriented: persistence, APIs, plan-aware behavior, clear empty states and upgrade CTAs.
