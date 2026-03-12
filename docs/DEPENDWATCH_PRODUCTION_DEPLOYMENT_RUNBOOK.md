# DependWatch — Production Deployment Runbook

**Purpose:** Step-by-step guide to ship DependWatch to production on Vercel (frontend), Railway (backend API + scheduler), Neon (PostgreSQL), Railway Redis, and npm (SDK/CLI). Use this as the canonical deployment blueprint.

**Last updated:** March 2025.

---

## 1. Codebase Audit Summary

### 1.1 Monorepo structure

| Path | Purpose |
|------|--------|
| `apps/web` | Next.js 14 App Router app: all UI, API routes, cron, webhooks. **Single deployable unit.** |
| `packages/sdk-node` | `@dependwatch/sdk-node` — Node SDK (init, wrap, track); sends events to `POST /api/ingest`. |
| `packages/dependwatch-cli` | `dependwatch` CLI (bin). Currently `private: true`. |
| `packages/shared` | Shared types/events (used by sdk-node). |

Root: `package.json` workspaces `["apps/*", "packages/*"]`; `build` runs `npm run build --workspace=apps/web`; `db:migrate` runs in `apps/web`.

### 1.2 Frontend vs backend

- **No split:** The app is one Next.js app. All API routes live under `apps/web/src/app/api/` (ingest, webhooks, cron, projects, workspaces, auth, MCP, etc.).
- **Implications:** To put “frontend on Vercel” and “backend on Railway” you either:
  - **Option A (recommended):** Deploy the **same** Next.js app to **both**. Vercel serves the app at `app.dependwatch.app`; configure **rewrites** so `/api/*` is proxied to Railway (`api.dependwatch.app`). Railway runs the same app and handles all API, webhooks, and cron. Both need the same env for server-rendered pages on Vercel (e.g. auth, DB for RSC) unless you move all data-fetching to client + API base URL (larger refactor).
  - **Option B (simpler ops):** Deploy **only** to Railway (one service). Use Vercel only for a separate marketing/landing site if desired. No proxy; one deployment, one env surface.

This runbook assumes **Option A** (Vercel frontend + Railway backend via proxy) and calls out Option B where it simplifies.

### 1.3 API routes (all under `apps/web`)

| Category | Routes | Notes |
|----------|--------|------|
| **Public (no auth)** | `/api/ingest`, `/api/webhooks/*`, `/api/auth/*`, `/api/health`, `/api/mcp` | Middleware bypasses JWT for these. |
| **Cron (secret)** | `POST /api/cron/scheduler`, `POST /api/cron/overage-billing` | Require `CRON_SECRET` (Bearer or `x-cron-secret`). |
| **Protected** | All other `/api/*` | Require NextAuth session (JWT in cookie). |

Ingest rate limit: **Redis-backed** when `REDIS_URL` is set (300 req/min per project); **in-memory** fallback per process when Redis is unavailable (resets on deploy; single-instance only). See §11.

### 1.4 Scheduled jobs / scheduler

- **No separate worker process.** Scheduling is HTTP-triggered:
  - `POST /api/cron/scheduler` — runs `runScheduler()` in `lib/scheduler.ts`: alert evaluation + digest delivery. Uses **Redis or DB locks** (`lib/locks`) for multi-instance safety.
  - `POST /api/cron/overage-billing` — runs `runOverageBillingForEligibleSubscriptions()` in `lib/overage-billing.ts` (uses same lock layer).
- **Cron must call these endpoints** with `CRON_SECRET`. Caller can be: Railway cron, Vercel Cron, or external (e.g. cron-job.org). If API is on Railway, cron should hit **Railway’s** base URL.

### 1.5 Prisma

- **Single datasource:** `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }` in `apps/web/prisma/schema.prisma`. No `directUrl` in schema today.
- **Neon:** Use **pooled** URL for runtime (`DATABASE_URL`). Use **direct** (non-pooled) URL for migrations; add `directUrl` to schema and set `DIRECT_URL` in env when using Neon.

### 1.6 Stripe webhooks

- **Route:** `POST /api/webhooks/stripe` in `apps/web/src/app/api/webhooks/stripe/route.ts`.
- **Verification:** `stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)`.
- **Events handled:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.finalized` (logging only).
- **Must be reachable** at a stable URL; Stripe sends to that URL. If API is on Railway, webhook URL = `https://api.dependwatch.app/api/webhooks/stripe`.

### 1.7 Auth

- NextAuth in `lib/auth.ts`: JWT strategy, Prisma adapter, Google/GitHub/Email (magic link via Resend or SMTP).
- Cookie name: `__Secure-next-auth.session-token` when `NEXTAUTH_URL` is https or `VERCEL` is set; else `next-auth.session-token`.
- Session: 30-day max, rolling update. Callbacks and env: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, OAuth and email env (see §10).

### 1.8 Environment variables (from codebase)

- **Required for Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP` (validated in `lib/config.ts`).
- **Auth:** `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET`, `AUTH_RESEND_KEY` or SMTP, `EMAIL_FROM`, `MFA_ENCRYPTION_KEY` (optional).
- **DB:** `DATABASE_URL`.
- **Cron:** `CRON_SECRET` (not in `.env.example`; must be set for production).
- **App URL:** `NEXT_PUBLIC_APP_URL` (checkout success redirect, invite links, docs examples).
- **Optional:** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `CONTACT_EMAIL`, `NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY`, `DEPENDWATCH_INGEST_URL` (SDK default ingest base).
- **Redis (optional):** `REDIS_URL`, `REDIS_PREFIX` (default `dw`), `REDIS_ENABLED` (default true when URL set), `CACHE_DEFAULT_TTL_SECONDS` (default 45). Used for dashboard cache (overview/intelligence), ingest rate limiting, scheduler/digest/overage locks, Stripe webhook idempotency. When unset, in-memory fallbacks are used (cache and rate limit per-process; locks use DB). See §11.

### 1.9 SDK / npm packages

- **`@dependwatch/sdk-node`** (`packages/sdk-node`): `main: dist/index.js`, builds with `tsc`. Uses `DEPENDWATCH_INGEST_URL` or `NEXT_PUBLIC_APP_URL` as default base; production should point to your ingest URL (e.g. `https://api.dependwatch.app`).
- **`dependwatch`** CLI (`packages/dependwatch-cli`): `bin: dependwatch`, `private: true`. Can be published as `dependwatch` or scoped.

---

## 2. Target Production Architecture

### 2.1 Diagram (conceptual)

```
[Users]
   | app.dependwatch.app (Vercel)
   v
[Next.js Frontend]  ----rewrite /api/*---->  [Next.js API on Railway]  api.dependwatch.app
   |                                                      |
   |                                                      +-- POST /api/ingest (Neon, optional Redis)
   |                                                      +-- POST /api/webhooks/stripe
   |                                                      +-- POST /api/cron/scheduler (CRON_SECRET)
   |                                                      +-- POST /api/cron/overage-billing (CRON_SECRET)
   |                                                      +-- All other /api/*
   v
[Neon PostgreSQL]  <---- DATABASE_URL (pooled), DIRECT_URL (migrations)
[Railway Redis]    <---- REDIS_URL (rate limit, future cache/queue)
```

### 2.2 Service responsibilities

| Service | Responsibility |
|--------|----------------|
| **Vercel** | Serve Next.js app (SSR, static, dashboard, settings, auth pages). Rewrite `/api/*` to Railway so API traffic hits backend. Env: same as Railway for RSC/auth; or minimal if you move all data to client + `NEXT_PUBLIC_API_URL` later. |
| **Railway (API)** | Run same Next.js app; handle all `/api/*`, webhooks, cron when invoked. DB (Neon), Redis, Stripe, cron caller. Must have `CRON_SECRET`, `STRIPE_*`, `DATABASE_URL`, etc. |
| **Neon** | PostgreSQL: runtime (pooled) + migrations (direct). |
| **Railway Redis** | Rate limiting for ingest (recommended), future cache/queues. |
| **npm** | Publish `@dependwatch/sdk-node` (and optionally `dependwatch` CLI) via CI. |

### 2.3 Recommended service split (Option A)

- **Vercel:** One project, root = `apps/web` (or monorepo root with root directory `apps/web`). Production domain `app.dependwatch.app`. Rewrites: `/api/:path*` → `https://api.dependwatch.app/api/:path*`.
- **Railway:** One service (or two: web + cron-runner if you prefer). **Web service:** build and run Next.js from `apps/web`; expose `api.dependwatch.app`. **Cron:** Either same service (external cron hits Railway URL) or a second “cron” service that only runs a loop/HTTP client calling the two cron endpoints every minute (scheduler) and daily (overage-billing).
- **Why:** Keeps one codebase; no API-only fork. Webhooks and ingest always hit Railway; cron caller hits Railway. Frontend is fast on Vercel edge; API and DB stay on Railway/Neon.

**Alternative (Option B):** Single Railway deployment (no Vercel). One service, one domain. Simpler env and no proxy; you give up Vercel’s edge and preview deployments for the app.

---

## 3. Environment Variables Matrix

### 3.1 Shared (Vercel + Railway)

| Variable | Purpose | Secret | Example | Notes |
|----------|---------|--------|---------|--------|
| `DATABASE_URL` | Prisma runtime (pooled) | Yes | `postgresql://...?sslmode=require` | Neon pooled connection string. |
| `DIRECT_URL` | Prisma migrations (direct) | Yes | `postgresql://...@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require` | Neon direct; use in schema `directUrl` for migrate. |
| `NEXTAUTH_URL` | Auth base URL | No | `https://app.dependwatch.app` | Must match app domain (Vercel). |
| `NEXTAUTH_SECRET` | JWT/session signing | Yes | `openssl rand -base64 32` | Same on both. |
| `AUTH_GOOGLE_ID` | Google OAuth | Yes | | |
| `AUTH_GOOGLE_SECRET` | Google OAuth | Yes | | |
| `AUTH_GITHUB_ID` | GitHub OAuth | Yes | | |
| `AUTH_GITHUB_SECRET` | GitHub OAuth | Yes | | |
| `AUTH_RESEND_KEY` | Magic link email | Yes | | Or SMTP_* instead. |
| `EMAIL_FROM` | From address | No | `DependWatch <noreply@dependwatch.app>` | |
| `MFA_ENCRYPTION_KEY` | TOTP encryption (optional) | Yes | 32 chars | |
| `STRIPE_SECRET_KEY` | Stripe API | Yes | `sk_live_...` | |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing | Yes | `whsec_...` | For endpoint on Railway. |
| `STRIPE_PRICE_BUILDER` | Pro price ID | No | `price_xxx` | |
| `STRIPE_PRICE_STARTUP` | Scale price ID | No | `price_xxx` | |
| `CRON_SECRET` | Cron endpoint auth | Yes | Random string | Not in .env.example; required for prod. |
| `NEXT_PUBLIC_APP_URL` | App origin (redirects, links) | No | `https://app.dependwatch.app` | Checkout return, invite links. |

### 3.2 Vercel-specific

| Variable | Purpose | Secret | Notes |
|----------|---------|--------|--------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics | No | Optional. |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host | No | e.g. `https://us.i.posthog.com` |
| `NEXT_PUBLIC_LOGO_DEV_PUBLISHABLE_KEY` | Logo.dev | No | Optional. |
| (Optional) `NEXT_PUBLIC_API_URL` | If frontend calls API by absolute URL | No | e.g. `https://api.dependwatch.app`; only if you don’t use rewrites. |

### 3.3 Railway-specific

| Variable | Purpose | Secret | Notes |
|----------|---------|--------|--------|
| `REDIS_URL` | Redis connection | Yes | Railway Redis URL. Use for rate limit (once implemented). |
| All shared above | Same as Vercel | — | Webhooks and cron run here. |

### 3.4 Worker / cron runner (if separate)

If you run a separate cron process that only calls the endpoints: it only needs the **Railway API base URL** and **CRON_SECRET** (to send `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`).

### 3.5 npm publishing CI

| Variable | Purpose | Secret | Notes |
|----------|---------|--------|--------|
| `NPM_TOKEN` | npm publish | Yes | Automation token. |
| Or GitHub Actions **trusted publishing** | Publish without NPM_TOKEN | — | Prefer for open source. |

### 3.6 Staging vs production

- Use different Stripe keys and webhook secrets (e.g. Stripe test mode for staging).
- Use different Neon branches (e.g. `main` = prod, `staging` = staging DB).
- `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`: staging = `https://staging.dependwatch.app` (or Vercel preview URL); prod = `https://app.dependwatch.app`.
- `CRON_SECRET`: different per environment.

---

## 4. Database / Prisma Deployment Strategy

### 4.1 Neon setup

- Create a project in Neon; create branch `main` (production).
- **Connection strings:**  
  - **Pooled (for runtime):** Use in `DATABASE_URL`. Pooler reduces connection churn (Neon pooler URL).  
  - **Direct (for migrations):** Use in `DIRECT_URL`. Prisma migrations need a direct connection (no pooler) for some operations.

### 4.2 Prisma schema change (Neon)

Add `directUrl` to `apps/web/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Set `DIRECT_URL` in env to Neon’s direct connection string; keep `DATABASE_URL` as pooled.

### 4.3 Who runs migrations

- **Recommended:** Run migrations from **CI** (e.g. GitHub Actions) or a **one-off Railway job** before/after deploy, using `DIRECT_URL` (or `DATABASE_URL` direct for Neon if you only have one URL in CI).
- **Command:** From repo root: `cd apps/web && npx prisma migrate deploy`. Ensure the runner has `DATABASE_URL` and `DIRECT_URL` set (Prisma uses `directUrl` for migrate when present).
- **Avoid:** Running `migrate deploy` from multiple services simultaneously (race). Single runner per env (e.g. one CI job or one Railway deploy hook).

### 4.4 Migration order and rollback

- Run migrations **before** deploying new code that depends on new schema (e.g. deploy DB first, then app).
- Rollback: Prisma has no automatic rollback. Keep migration SQL reversible where possible; for breaking changes, prepare a reverse migration and run manually if needed.
- Staging: Apply same migrations to staging branch first; validate; then prod.

### 4.5 Neon branching (optional)

- Use Neon branch `staging` for staging env and `main` for production. Point staging app to staging DB URL; prod to prod DB URL.

---

## 5. Backend Deployment on Railway

### 5.1 Railway project structure

- One Railway project (e.g. “DependWatch”).
- **Services:**  
  - **web:** Next.js API (and optionally full app if you don’t use Vercel).  
  - (Optional) **redis:** Railway Redis plugin.  
- **Variables:** Set all env vars from §3.1 and §3.3 (shared + Railway). Connect Neon and Redis as needed.

### 5.2 Web service configuration

- **Root directory:** `apps/web` (or repo root with build/start that targets apps/web).
- **Build command:** `npm install && npx prisma generate && npm run build` (from repo root: `npm install --workspace=apps/web` and build in apps/web; or from apps/web if you cd there in build).  
  Example (root): `cd apps/web && npm ci && npx prisma generate && npm run build`
- **Start command:** `cd apps/web && npm run start` (or `npx next start` from apps/web). Ensure `PORT` is used (Railway sets `PORT`); Next.js uses it by default.
- **Health check:** Configure HTTP health check to `GET /api/health`. Returns `{ status: 'ok', db: 'ok' }` when DB is reachable.

### 5.3 Connecting Neon

- In Railway, add variable `DATABASE_URL` = Neon pooled URL and `DIRECT_URL` = Neon direct URL (from Neon dashboard).
- Or use Railway’s Neon integration if available; then map variable names accordingly.

### 5.4 Connecting Redis

- Add Railway Redis plugin; get `REDIS_URL`. Add `REDIS_URL` to the web service.
- **Current code:** Ingest and contact rate limits are in-memory. To use Redis for ingest rate limiting, implement a small Redis-based rate limiter (e.g. key = `ratelimit:ingest:{projectId}`, INCR + TTL 60s, max 300). See §11.

### 5.5 Cron invocation

- **Option 1:** External cron (e.g. cron-job.org, GitHub Actions scheduled workflow) calls:
  - `POST https://api.dependwatch.app/api/cron/scheduler` every minute with `Authorization: Bearer <CRON_SECRET>`.
  - `POST https://api.dependwatch.app/api/cron/overage-billing` daily with same header.
- **Option 2:** Railway cron (if available) or a second “cron” service that runs a small script/container that does the same HTTP calls on schedule.
- Do **not** put long-running logic in the HTTP handler; the existing design runs work inside the request and uses DB locks. Ensure cron request timeout is high enough (e.g. 60–120s for scheduler).

### 5.6 Webhook URL

- Stripe: add endpoint `https://api.dependwatch.app/api/webhooks/stripe`, subscribe to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.finalized`. Set `STRIPE_WEBHOOK_SECRET` to the signing secret.

### 5.7 Logs and restarts

- Use Railway logs for errors; ensure `[cron/scheduler]`, `[cron/overage-billing]`, `[Stripe webhook]` are visible. Set up alerts on 5xx or repeated errors.
- Restart policy: default; scale to 1 for cron if you use a single cron runner to avoid duplicate runs (scheduler uses DB locks, but overage-billing is also idempotent via BillingOverageRecord).

### 5.8 Docker (optional)

- For reproducible builds, add `apps/web/Dockerfile` (multi-stage: install, prisma generate, next build, then run `next start`). Point Railway to this Dockerfile. Use `DIRECT_URL` for migrations if you run them in the image or a separate job.

---

## 6. Frontend Deployment on Vercel

### 6.1 Project setup

- Import repo; set **Root Directory** to `apps/web` (or leave root and set Build/Output to use `apps/web`). Vercel monorepo: root directory `apps/web`.
- **Framework:** Next.js (auto-detected).
- **Build command:** `npm run build` (run from apps/web; ensure dependencies: from root `npm install` then build in apps/web, or set Install Command to run from root).
- **Output:** Default Next.js (no static export).

### 6.2 Environment variables

- Add all **shared** variables from §3.1 so that server-rendered pages (auth, RSC) work. If you use rewrites to Railway for `/api/*`, Vercel still needs DB and auth for any server components that touch DB or session.
- Set `NEXTAUTH_URL` = `https://app.dependwatch.app` (or your Vercel production URL).
- Set `NEXT_PUBLIC_APP_URL` = same.

### 6.3 Rewrites (API to Railway)

In `apps/web/vercel.json` (or Vercel project settings → Rewrites):

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://api.dependwatch.app/api/:path*" }
  ]
}
```

Then all `fetch('/api/...')` from the browser go to Vercel, which proxies to Railway. No client change needed.

### 6.4 Auth callback URLs

- Google OAuth: add `https://app.dependwatch.app/api/auth/callback/google` to authorized redirect URIs.
- GitHub: add `https://app.dependwatch.app/api/auth/callback/github` and set callback URL in GitHub app to `https://app.dependwatch.app/api/auth/callback/github`.
- NextAuth will issue cookies for `app.dependwatch.app`; session is valid when hitting Vercel.

### 6.5 Preview vs production

- Preview deployments: use same rewrites; set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the preview URL for that deployment, or use a single staging backend URL for all previews. Stripe and DB for preview: use test/staging env.

### 6.6 Domain

- In Vercel, add domain `app.dependwatch.app` (or your chosen app domain). SSL is automatic.

---

## 7. Stripe Production Setup

### 7.1 Products and prices

- Create two products (or use existing): **Pro** (Builder), **Scale** (Startup).
- Create recurring prices (monthly); note **Price IDs** (e.g. `price_xxx`).
- Map: `STRIPE_PRICE_BUILDER` = Pro price ID, `STRIPE_PRICE_STARTUP` = Scale price ID. Used in `lib/config.ts` and `lib/stripe.ts` for checkout and plan resolution.

### 7.2 Webhook

- **URL:** `https://api.dependwatch.app/api/webhooks/stripe` (must be the Railway-served URL so Stripe hits your backend).
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.finalized`.
- **Signing secret:** Copy from Stripe dashboard; set as `STRIPE_WEBHOOK_SECRET` on Railway.
- **Verification:** Already implemented with `stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)`; never skip verification.

### 7.3 Checkout flow

- Frontend calls `POST /api/stripe/checkout` with `planId` and `workspaceId`; backend creates Checkout session with `success_url` = `NEXT_PUBLIC_APP_URL` (e.g. billing page) and `metadata.workspaceId`, `metadata.planId`. Ensure `NEXT_PUBLIC_APP_URL` is the app domain (Vercel).

### 7.4 Testing in production

- **Upgrade:** Click Upgrade → Checkout → complete with test card; confirm webhook updates `Subscription` and plan reflects in app.
- **Downgrade / cancel:** In Stripe, cancel or change subscription; confirm `customer.subscription.deleted` or `updated` sets plan to free or new plan.
- **Failure modes:** If webhook fails (5xx), Stripe retries. Monitor Railway logs; fix handler and idempotency so retries are safe.

### 7.5 Env checklist

- `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (live endpoint), `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP` on Railway (and Vercel if any server-side Stripe calls).

---

## 8. Alerts / Digests / Scheduler Deployment

### 8.1 How it runs

- **Alert evaluation and digest delivery** are triggered by **HTTP:** `POST /api/cron/scheduler` with `CRON_SECRET`. The handler calls `runScheduler()` which:
  - Queries projects due for alert evaluation (ProjectScheduleConfig.alertEvaluationFrequencyMinutes) and runs `evaluateAlertRules()`; sends to Slack; updates `lastAlertEvaluationAt`.
  - Queries projects due for digest (digestEnabled, frequency, timeOfDay, timezone) and runs `runDigestDelivery()`; sends to project Slack webhooks; updates `lastDigestAt`.
- **Locks:** `SchedulerLock` in DB prevents duplicate work across instances. No separate worker process.

### 8.2 Overage billing

- **HTTP:** `POST /api/cron/overage-billing` with `CRON_SECRET`. Runs `runOverageBillingForEligibleSubscriptions()`; creates Stripe invoice items and BillingOverageRecord. Idempotent; run daily (or every 6–12h). See `docs/OVERAGE_BILLING_RUNBOOK.md`.

### 8.3 Who calls cron

- **Must call the Railway API base URL** (e.g. `https://api.dependwatch.app`), not Vercel, so that DB and Stripe are used from the same app instance that runs the logic.
- **Scheduler:** Every 1–5 minutes (e.g. every minute). **Overage billing:** Once per day (e.g. 02:00 UTC).
- **Auth:** `Authorization: Bearer <CRON_SECRET>` or header `x-cron-secret: <CRON_SECRET>`.

### 8.4 Retries and idempotency

- Scheduler and overage-billing are idempotent (DB locks and BillingOverageRecord). Retries are safe; avoid overlapping long runs by spacing cron interval (e.g. 1 min for scheduler is fine; handler should complete in &lt;60s for typical load).

### 8.5 Slack delivery

- Alert and digest delivery post to project Slack webhooks (SlackWebhookConfig). Log failures; ensure Slack webhook URLs are valid. No email delivery in current code.

### 8.6 Failure logging

- Errors are logged with `[scheduler]` and `[cron/overage-billing]`. Monitor Railway logs and alert on repeated 500s or error messages.

---

## 9. Auth / OAuth / Session Production Checklist

- **NEXTAUTH_URL:** Exactly the app origin (e.g. `https://app.dependwatch.app`). No trailing slash.
- **NEXTAUTH_SECRET:** Strong random value; same on Vercel and Railway if both serve auth (e.g. for RSC).
- **Google:** Authorized redirect URI = `https://app.dependwatch.app/api/auth/callback/google`.
- **GitHub:** Callback URL = `https://app.dependwatch.app/api/auth/callback/github`.
- **Cookies:** Secure cookies used when NEXTAUTH_URL is https (and when VERCEL is set). SameSite=Lax. Domain will be app.dependwatch.app when served from Vercel.
- **Magic link:** Set AUTH_RESEND_KEY or SMTP; EMAIL_FROM. Test sign-in with email in production.
- **Session consistency:** If frontend is on Vercel and API on Railway, session cookie is set by Vercel (NextAuth runs there for page auth). API on Railway receives the same cookie when requests are made from the same origin (browser sends cookie to Vercel; if you use rewrites, the request to Railway may be server-side from Vercel—then cookie might not be forwarded unless you proxy headers; verify that API calls from client go to same origin so cookie is sent). With rewrites, browser does `fetch('/api/...')` to app.dependwatch.app; Vercel proxies to Railway. So the request from browser is to Vercel; the server-side proxy from Vercel to Railway must forward cookies (Vercel rewrites typically forward headers). Confirm in practice that authenticated API calls work after login.

---

## 10. Redis Usage Strategy

### 10.1 Current state

- **No Redis in code.** Ingest rate limit is in-memory (per process); contact form has in-memory rate limit. Scheduler uses DB locks only.

### 10.2 Recommended for production

- **Ingest rate limiting:** Replace in-memory `Map` in `api/ingest/route.ts` with Redis: key `ratelimit:ingest:{projectId}`, INCR, EXPIRE 60s, max 300 per window. Requires `REDIS_URL` and a small Redis client (e.g. `ioredis` or `@upstash/redis` if using Upstash). This runbook assumes Railway Redis; use a compatible client.
- **Idempotency:** Overage billing and scheduler already use DB for idempotency. Optional: use Redis for short-lived idempotency keys for webhooks (e.g. Stripe event ID) if you want to dedupe before DB.
- **Caching:** Optional: cache overview or intelligence responses per project/range with short TTL to reduce DB load; introduce later if needed.
- **Queue:** No queue today; scheduler is pull-based (cron calls endpoint). If you add a job queue later, Railway Redis can back it.

### 10.3 Introducing Redis cleanly

- Add `REDIS_URL` to Railway; create a small `lib/redis.ts` that returns a client or null if `REDIS_URL` is unset.
- In ingest route, if Redis is available use Redis rate limit; else fall back to current in-memory limit (with a log warning in production).

---

## 11. NPM Publishing Strategy

### 11.1 Packages

- **@dependwatch/sdk-node** — Public package for the Node SDK. Remove `"private": true` when publishing. Name is already scoped.
- **dependwatch** (CLI) — Optional; can stay private or publish as `dependwatch` (or `@dependwatch/cli`).

### 11.2 Versioning

- Use semver. Pre-1.0: minor = new features, patch = fixes. After 1.0: major = breaking, minor = features, patch = fixes.

### 11.3 Build and publish (sdk-node)

- From repo root: `cd packages/sdk-node && npm run build` (produces `dist/`).
- Publish: `npm publish --access public` (for scoped package first time).
- Ensure `package.json` has `files: ["dist", "README.md"]`, no stray files.

### 11.4 CI/CD (e.g. GitHub Actions)

- On release (tag or manual workflow): checkout, install, build sdk-node, `npm publish` with `NPM_TOKEN` (or use npm trusted publishing). Only publish from main/protected branch or tags.
- Example: `npm run build --workspace=@dependwatch/sdk-node` then `cd packages/sdk-node && npm publish --access public`.

### 11.5 Default ingest URL in SDK

- SDK defaults to `DEPENDWATCH_INGEST_URL` or `NEXT_PUBLIC_APP_URL` or hardcoded `https://app.dependwatch.app`. For production, customers should set `baseUrl` in `init()` to `https://api.dependwatch.app` (or your ingest base) so events hit the correct backend. Document this in SDK README.

### 11.6 Release checklist

- Bump version in package.json; changelog; tag; run CI; after publish, smoke test: `npm install @dependwatch/sdk-node` in a temp project and send one event to your ingest URL.

---

## 12. Domain / DNS / URL Architecture

- **app.dependwatch.app** → Vercel (Next.js app). SSL via Vercel.
- **api.dependwatch.app** → Railway (Next.js API). SSL via Railway or your DNS (CNAME to Railway).
- **Webhooks:** `https://api.dependwatch.app/api/webhooks/stripe`.
- **Auth callbacks:** `https://app.dependwatch.app/api/auth/callback/google` (and github).
- **Cron:** Call `https://api.dependwatch.app/api/cron/scheduler` and `https://api.dependwatch.app/api/cron/overage-billing`.
- **Docs:** Served from same app (e.g. `/docs`) on Vercel.
- Staging: e.g. `staging.dependwatch.app` (Vercel) and `api-staging.dependwatch.app` (Railway); same pattern.

---

## 13. CI/CD and Release Flow

### 13.1 Vercel

- Connect GitHub repo; production branch = `main`. Deploys on push. Set env in Vercel dashboard. Preview deployments for PRs (use staging env or same prod if careful).

### 13.2 Railway

- Connect GitHub repo; deploy on push to `main` (or chosen branch). Build and start as in §5. Set env in Railway. Run migrations in a deploy hook or separate CI step before/after deploy.

### 13.3 Migration order

- Run `prisma migrate deploy` (with DIRECT_URL) **before** or **as part of** deploy so new code never runs against old schema. Prefer: CI job runs migrate, then triggers deploy or deploy runs migrate in a release phase.

### 13.4 Avoiding downtime

- Neon and Railway support zero-downtime deploys. Use health checks; deploy new instance, then switch traffic. For Prisma, backward-compatible migrations (add column, deploy, then drop old) reduce risk.

### 13.5 Rollback

- **App:** Revert commit and redeploy; or redeploy previous Railway/Vercel deployment.
- **DB:** No automatic rollback; restore from Neon backup if needed and fix data. Prefer forward-only migrations where possible.

### 13.6 Post-deploy smoke tests

- GET `https://app.dependwatch.app` (200).
- GET `https://api.dependwatch.app/api/health` (200, db ok).
- POST to ingest with valid key (201 or 200).
- Login (Google or GitHub) and open dashboard.

---

## 14. Observability / Production Safety

- **Health:** `GET /api/health` returns `{ status: 'ok', db: 'ok' }` or 503 if DB fails. Use for Railway and load balancer health checks.
- **Structured logs:** Add request IDs and structured fields (projectId, workspaceId) where useful. Keep existing `[cron/scheduler]`, `[Stripe webhook]` prefixes for grep.
- **Alerting:** Alert on 5xx from API (e.g. Railway metrics or external APM). Alert on repeated cron failures (scheduler, overage-billing).
- **Stripe webhooks:** Monitor Stripe dashboard for failed events; fix and replay if needed. Log webhook errors in Railway.
- **Scheduler/digest:** Log alert and digest results; alert if error rate is high or zero success over N runs.
- **DB:** Monitor Neon connection count and query latency; set up Neon alerts.
- **Redis:** Monitor memory and connection count when in use.
- **Key metrics:** Signups, onboarding completion, ingest volume, alert/digest delivery success, Stripe webhook success, cron run success.

---

## 15. Pre-Launch Checklist

- [ ] Neon: Production DB created; `DATABASE_URL` (pooled) and `DIRECT_URL` set; Prisma schema has `directUrl` if using Neon.
- [ ] Migrations: All applied (`prisma migrate deploy`); no pending migrations.
- [ ] Railway: Web service deployed; env set (DB, NEXTAUTH_*, STRIPE_*, CRON_SECRET, REDIS_URL if used); health check 200.
- [ ] Vercel: App deployed; rewrites for `/api/*` to Railway; env set; domain app.dependwatch.app.
- [ ] Stripe: Live products/prices; webhook endpoint `https://api.dependwatch.app/api/webhooks/stripe`; events subscribed; STRIPE_WEBHOOK_SECRET set.
- [ ] Auth: Google and GitHub callbacks use app.dependwatch.app; magic link email works (Resend or SMTP).
- [ ] Cron: Scheduler called every minute; overage-billing called daily; both return 200 with CRON_SECRET.
- [ ] Slack: Create test project, add Slack webhook, trigger alert and digest; confirm delivery.
- [ ] Billing: Upgrade flow to Pro/Scale; complete Checkout; confirm webhook updates Subscription and UI.
- [ ] Test events: Send test events from dashboard; confirm events in dashboard and usage.
- [ ] SDK: Install @dependwatch/sdk-node (or use workspace build); init with ingest key and baseUrl = api.dependwatch.app; send event; confirm in dashboard.
- [ ] npm: If publishing, @dependwatch/sdk-node published; smoke test install and one event.
- [ ] Env: All production env vars verified (no test keys in prod).
- [ ] Docs: DEPENDWATCH_SOURCE_OF_TRUTH.md and OVERAGE_BILLING_RUNBOOK.md updated if needed.

---

## 16. Post-Launch Checklist (24h / 7d)

**24h**

- [ ] Verify first signups and onboarding completion.
- [ ] Verify first real event ingestion (non-demo) and appearance in dashboard.
- [ ] Verify at least one alert evaluation and Slack delivery (if any project configured).
- [ ] Verify at least one digest delivery (if configured).
- [ ] Check Stripe: first successful checkout and webhook delivery.
- [ ] No auth/session issues (no spike of login redirects or expired sessions).
- [ ] No webhook failures in Stripe dashboard; no 5xx on /api/webhooks/stripe in logs.
- [ ] Cron: scheduler and overage-billing runs logged and successful.

**7d**

- [ ] Retention: users returning; projects with ongoing ingest.
- [ ] Billing: multiple upgrades or renewals if applicable; overage billing run created records where expected.
- [ ] No unexplained DB or Redis errors; Neon and Railway metrics normal.
- [ ] Docs and runbooks updated with any production learnings.

---

## 17. Summary

### 17.1 File created

- **Path:** `docs/DEPENDWATCH_PRODUCTION_DEPLOYMENT_RUNBOOK.md`

### 17.2 Recommended production architecture (one paragraph)

Deploy the same Next.js app to **Vercel** (frontend at app.dependwatch.app) with rewrites so `/api/*` is proxied to **Railway** (api.dependwatch.app), which runs the same app and handles all API routes, Stripe webhooks, and cron endpoints. Use **Neon** for PostgreSQL (pooled DATABASE_URL for runtime, DIRECT_URL for migrations), **Railway Redis** for ingest rate limiting once implemented, and run **Prisma migrations** from CI or a single deploy step. Trigger **scheduler** every minute and **overage-billing** daily via external cron or Railway cron calling the Railway API with CRON_SECRET. Publish **@dependwatch/sdk-node** (and optionally the CLI) to npm via CI with a proper default ingest baseUrl (api.dependwatch.app).

### 17.3 Top 5 production mistakes to avoid

1. **Webhook or cron pointing at Vercel** — Stripe and cron must hit Railway (api.dependwatch.app) so the same DB and secrets are used; otherwise webhooks or cron may fail or use wrong env.
2. **Missing CRON_SECRET** — Cron endpoints return 401 without it; set CRON_SECRET in Railway and in the cron caller.
3. **Using only DATABASE_URL for migrations on Neon** — Use DIRECT_URL (and Prisma directUrl) for migrations to avoid pooler limitations.
4. **In-memory rate limit in production** — It resets on every deploy and is not shared across instances; move ingest rate limiting to Redis before high traffic.
5. **NEXTAUTH_URL / cookie domain mismatch** — NEXTAUTH_URL must be the exact app origin (https://app.dependwatch.app); wrong value breaks session and redirects.

### 17.4 Deploy order

1. **First:** Neon (create DB, get pooled + direct URLs); run Prisma migrations; add DIRECT_URL to schema and env.
2. **Second:** Railway (create project, add Redis if used, deploy web service with full env including CRON_SECRET and Stripe); configure domain api.dependwatch.app; verify /api/health and cron with CRON_SECRET.
3. **Third:** Vercel (deploy app, set rewrites to Railway, set NEXTAUTH_URL and app domain); configure app.dependwatch.app; add OAuth callbacks; verify login and API calls via proxy.
4. **Fourth:** Stripe (webhook URL to api.dependwatch.app, live keys); test checkout and webhook.
5. **Fifth:** Cron (schedule scheduler + overage-billing against api.dependwatch.app); npm publish when ready.

---

*This runbook is the canonical deployment guide for DependWatch on Vercel, Railway, Neon, Railway Redis, and npm. Update it when the architecture or env changes.*
