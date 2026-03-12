# DependWatch — Test Readiness Checklist

Use this checklist to verify all launch-critical flows before founder, friendly-user, or beta testing. Run through each section in order; fix any failure before proceeding.

---

## Prerequisites

- **Environment:** Copy `.env.example` to `.env` (or `apps/web/.env`). Set at minimum:
  - `DATABASE_URL` — PostgreSQL connection string
  - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
  - `NEXTAUTH_URL` — `http://localhost:3000` (use HTTPS in production)
- **Database:** From repo root:
  ```bash
  cd apps/web && npx prisma migrate dev && npx prisma db seed && cd ../..
  ```
- **App:** From repo root: `npm run dev`. Open http://localhost:3000.

---

## A. AUTH

| Step | Action | Expected |
|------|--------|----------|
| A1 | **Sign up** — Click "Start Monitoring APIs" or go to `/login?signup=1`. | Login page with Create account / Google / GitHub / magic link. |
| A2 | **Sign in (OAuth)** — If `AUTH_GOOGLE_ID`/`AUTH_GITHUB_ID` are set, click "Continue with Google" or "Continue with GitHub". | Redirect to provider, then back to `/onboarding`. |
| A3 | **Sign in (magic link)** — Enter email → Submit. With SMTP/Resend: check inbox. Without: copy URL from terminal where `npm run dev` runs. | Land on `/onboarding` after clicking link. |
| A4 | **Session persistence** — After sign-in, close tab and reopen http://localhost:3000/dashboard (or any protected path). | No redirect to login; you see dashboard or onboarding. |
| A5 | **Logout** — Use header/settings to sign out. | Redirect to login or home. |
| A6 | **Protected route** — While logged out, open `/dashboard/any/any`. | Redirect to `/login` with callbackUrl. |
| A7 | **Session expired** — If middleware sends `expired=1`, login page shows "Your session expired." | Message visible; sign-in works. |

---

## B. ONBOARDING

| Step | Action | Expected |
|------|--------|----------|
| B1 | **Create workspace** — On onboarding, enter workspace name → Continue. | Step advances to "Name your first project". |
| B2 | **Create project** — Enter project name → Continue. | Step advances to "Your ingest key". |
| B3 | **Copy ingest key** — Key is shown (starts with `dw_live_`). Copy it. Click "Go to dashboard". | Redirect to project dashboard (`/dashboard/<workspaceId>/<projectId>`). |
| B4 | **Empty state** — Dashboard shows "No API events yet", "Send a test event" CTA, and a **Preview dashboard** card clearly labeled **Sample data only**. | No real metrics; preview section is explicitly sample. |
| B5 | **Ingest key in empty state** — In empty state, ingest key card shows prefix or "Reveal". Settings link works. | Key management and link to Settings are available. |

---

## C. SDK / INGESTION / TEST EVENTS

| Step | Action | Expected |
|------|--------|----------|
| C1 | **Send test events (UI)** — On project dashboard empty state, click "Send a test event — watch the dashboard populate". | "Ingesting events…" stream, then "10 events ingested", then dashboard shows real KPIs and tables. |
| C2 | **Send test events (script)** — In a new terminal, with ingest key from B3: `DEPENDWATCH_INGEST_KEY=<key> INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts` | Script prints "Sent 6 events"; no error. (UI "Send test event" creates 10 events.) |
| C3 | **Dashboard after script** — Refresh or wait for poll. Switch range to 24h if needed. | Total calls, provider table, charts show data from script. |
| C4 | **Ingest API (direct)** — `curl -X POST http://localhost:3000/api/ingest -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"events":[{"provider":"openai","endpoint":"test","duration_ms":100,"success":true}]}'` | HTTP 200, body `{"ok":true,"received":1}`. |
| C5 | **SDK install** — From a Node project: `npm install @dependwatch/sdk-node` (or use workspace). Build if local: `cd packages/sdk-node && npm run build`. | Package installs and exports `init`, `wrap`, `track`. |
| C6 | **SDK init + wrap** — In app code: `init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY, baseUrl: 'http://localhost:3000' });` then `wrap({ provider: 'openai', endpoint: 'chat.completions' }, async () => { ... })`. | Events appear in dashboard (may take flush interval). |

---

## D. DASHBOARD

| Step | Action | Expected |
|------|--------|----------|
| D1 | **KPI cards** — With data, dashboard shows Total calls, Avg latency, Error rate, Projected monthly cost. | Numbers match project's events; no mock data. |
| D2 | **By provider table** — Table lists providers with calls, error rate, P50/P95, cost. | Real data from `ApiCallEvent`. |
| D3 | **Operations table** — Table lists operation (provider.endpoint) with metrics. Click row → detail modal. | Operation detail loads (calls, P95, cost, recent failures). |
| D4 | **Insights** — With Pro/Scale plan, Insights card shows cost drivers, reliability issues, slow endpoints (or "No insights in this period"). | Insights from real analytics; Free plan may show empty or gated. |
| D5 | **Guardrails** — With Pro/Scale, Guardrails card shows cost/error/latency/traffic alerts or "No guardrail alerts". | From real guardrail logic; Free plan may show empty or gated. |
| D6 | **Recent failures** — Section lists failed API calls; click for event detail. | Real events from DB. |
| D7 | **Event stream** — Recent API events list; click Details. | Event detail modal with provider, endpoint, latency, status. |
| D8 | **Dependency map** — On Pro/Scale, Dependency map card shows provider table (calls, reliability, P95, cost). Free shows upgrade CTA. | Plan-gated; data from dependency map analytics. |
| D9 | **Usage card** — "Usage this month" shows events count, limit, plan name, projected API cost. | From usage API; overage shown if over limit. |

---

## E. BILLING

| Step | Action | Expected |
|------|--------|----------|
| E1 | **Billing page** — Go to Billing (sidebar or `/dashboard/<workspaceId>/billing`). | Current plan (Free/Pro/Scale), upgrade buttons if Stripe configured. |
| E2 | **Upgrade (Stripe)** — Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP`, `NEXT_PUBLIC_APP_URL`. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`; set `STRIPE_WEBHOOK_SECRET` to CLI secret. Click "Upgrade to Pro". | Redirect to Stripe Checkout. |
| E3 | **After payment** — Complete checkout (test card `4242 4242 4242 4242`). | Redirect to Billing with "You're all set. Your plan and limits are updated." and Current plan: Pro. |
| E4 | **Plan gating** — As Pro, dashboard shows Insights, Guardrails, Dependency map. As Free, those may be empty or show upgrade CTA. | Visibility matches plan limits. |

---

## F. DOCS / MCP

| Step | Action | Expected |
|------|--------|----------|
| F1 | **Quickstart** — Open `/docs`, follow Quickstart (create account, project, key, send test event, install SDK, init + wrap). | Steps match product; code snippets run. |
| F2 | **Doc links** — From dashboard empty state, click "Quickstart" or "Setup docs". | Navigate to `/docs` or correct anchor. |
| F3 | **MCP (if used)** — Create MCP token in Project → Connect assistant or Settings. Add to Cursor/Claude MCP config with `http://localhost:3000/api/mcp` and Bearer token. | "List my DependWatch projects" returns projects; "Send a test event" succeeds. |

---

## G. LANDING / MARKETING

| Step | Action | Expected |
|------|--------|----------|
| G1 | **CTA** — From `/`, click "Start Monitoring APIs" or plan CTAs. | Go to `/login?signup=1`. |
| G2 | **Pricing** — Click Pricing in header or link to `/pricing`. | Pricing page with Free / Pro / Scale and correct limits. |
| G3 | **Docs** — Click Docs. | `/docs` loads. |

---

## H. HEALTH / OPERABILITY

| Step | Action | Expected |
|------|--------|----------|
| H1 | **Health** — `curl http://localhost:3000/api/health` | 200, body `{"status":"ok","db":"ok"}` (or `db":"skipped"` if no DATABASE_URL). |
| H2 | **DB down** — Stop Postgres or use invalid DATABASE_URL. | Health returns 503, `{"status":"error","db":"unhealthy"}`. |

---

## Quick command reference

```bash
# From repo root
npm install
cd apps/web && npx prisma migrate dev && npx prisma db seed && cd ../..
npm run dev

# Second terminal — after you have an ingest key
DEPENDWATCH_INGEST_KEY=dw_live_xxx INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts

# Stripe webhook (second terminal)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Real vs sample matrix

| Surface | Source | Notes |
|--------|--------|-------|
| **Dashboard (has data)** | Real | KPIs, by-provider, by-operation, timeseries, recent failures, event stream, usage card, insights, guardrails, dependency map — all from `ApiCallEvent` and analytics. |
| **Dashboard (empty state)** | Sample only | "Preview dashboard" card is explicitly labeled **Sample data only**; copy states "This is example data. Send a test event above to see real metrics." |
| **Test events (UI button)** | Real | Uses shared `ingest-service`: `getSampleTestEvents()` + `ingestEventsForProject(..., { source: 'ui_test' })`. Events persist to DB and appear as real data. |
| **Test events (script)** | Real | Script POSTs to `/api/ingest` with Bearer key; same ingest path as SDK. |
| **MCP send_test_event** | Real | Uses `getSampleTestEvents()` + `ingestEventsForProject(..., { source: 'mcp' })`. Same persistence. |
| **Landing / pricing** | Copy only | No live data; plan features and limits match `lib/stripe.ts` and `pricing-constants.ts`. |
| **Docs** | Static | Code snippets; no fake metrics. |

---

## Go / no-go

- **Go for testing** when: Auth (sign up, sign in, session, logout), Onboarding (workspace → project → key → dashboard), Test events (UI + script), Dashboard (KPIs, tables, insights/guardrails with real data), and Billing (upgrade flow if Stripe configured) all pass.
- **Fix before testing** any flow that fails or shows misleading data (e.g. fake metrics not labeled as sample).
