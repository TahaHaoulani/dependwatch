# DependWatch

**External API observability for modern SaaS.**  
Latency, errors, and projected cost for every API your product calls — in one place.

## Why DependWatch exists

Modern SaaS apps depend on many third-party APIs:

- OpenAI  
- Stripe  
- Resend  
- Clerk  
- Supabase  
- Twilio  

When these APIs become slow or expensive, developers usually discover it too late:

- users complain about slowness  
- error rates spike  
- the monthly bill explodes  

DependWatch provides visibility into this hidden layer.

## What it does

- **SDK-first instrumentation**: Wrap external API calls (OpenAI, Stripe, Resend, etc.) with the Node SDK; events flow to DependWatch.
- **Dashboard**: Per-provider metrics, latency percentiles, error rate, volume, and projected monthly cost.
- **Alerts**: Configurable thresholds for latency, error rate, and budget; email and (on Startup plan) Slack.
- **Billing**: Free, Builder ($29/mo), Startup ($79/mo) with Stripe.

## SDK example

You instrument by **wrapping** async API calls (we measure duration and success) or by **tracking** events manually. Both send events to DependWatch for latency, error rate, and cost projection.

### 1. Install and init

```bash
# From npm (when published)
npm install @dependwatch/sdk-node

# Or from monorepo workspace
npm install
cd packages/sdk-node && npm run build
```

```ts
import { init, wrap, track } from "@dependwatch/sdk-node"

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
  // optional: baseUrl for self-hosted, flushIntervalMs, maxBatchSize
})
```

### 2. Wrap external API calls (recommended)

Use `wrap()` around any async call. We record duration, status, and optional cost.

```ts
import OpenAI from "openai"
import { wrap } from "@dependwatch/sdk-node"

const openai = new OpenAI()

// Wrap the call — we measure latency and success automatically
const result = await wrap(
  {
    provider: "openai",
    endpoint: "chat/completions",
    estimated_cost_usd: 0.002, // optional, for cost projection
  },
  async () => {
    return await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }],
    })
  }
)
```

Same pattern for Stripe, Resend, or any HTTP client:

```ts
await wrap(
  { provider: "stripe", endpoint: "customers.create" },
  async () => stripe.customers.create({ email: "user@example.com" })
)
```

### 3. Manual tracking

If you already measure duration (e.g. in middleware), use `track()`:

```ts
import { track } from "@dependwatch/sdk-node"

const start = Date.now()
let success = true
try {
  await openai.chat.completions.create({ ... })
} catch {
  success = false
  throw ...
} finally {
  track({
    provider: "openai",
    endpoint: "chat.completions",
    duration_ms: Date.now() - start,
    success,
    status_code: success ? 200 : 500,
    estimated_cost_usd: 0.002,
  })
}
```

Without this, devs won’t know how to integrate; the README must show **exactly** how.

## Repo structure

```
apps/web          # Next.js SaaS app (marketing, auth, dashboard, ingestion API)
packages/sdk-node # Node/TypeScript SDK for instrumenting API calls
packages/shared   # Shared types/schemas (used by SDK and optionally web)
```

## Local development

### Prerequisites

- Node 18+
- PostgreSQL
- (Optional) Stripe CLI for webhooks, Resend for magic-link email

### Setup

1. **Clone and install**

   ```bash
   cd dependwatch
   npm install
   ```

2. **Environment**

   Put your env vars in a `.env` file. When you run `npm run dev` from the **repo root**, the root `.env` is loaded automatically. You can instead use `apps/web/.env` (copy from `.env.example`) if you run commands from `apps/web`. Set at least:

   - `DATABASE_URL` — Postgres connection string
   - `NEXTAUTH_SECRET` — e.g. `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `http://localhost:3000`
   - For magic link email: **SendGrid SMTP** (recommended) — set `SENDGRID_API_KEY` and `EMAIL_FROM`; or use `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS`. Optional fallback: `AUTH_RESEND_KEY`.
   - For Google OAuth: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
   - For GitHub OAuth: `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`
   - For Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP`, `NEXT_PUBLIC_APP_URL`

3. **Database**

   ```bash
   cd apps/web
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Run the app**

   From repo root:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Send sample events (local dashboard)

1. Sign in, create a workspace and project, copy the ingest key.
2. From repo root:

   ```bash
   DEPENDWATCH_INGEST_KEY=dw_live_xxx INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts
   ```

3. Refresh the project dashboard to see events.

### Launch test (local QA) — 4 core flows

Run through these steps to confirm launch-critical paths work locally:

1. **Start app**
   - `npm run dev` (from repo root). Open http://localhost:3000.

2. **Sign up / sign in**
   - Click “Start Monitoring APIs” or go to `/login?signup=1`.
   - **Google / GitHub**: Set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` or `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` to show those buttons.
   - **Magic link**: Set `SENDGRID_API_KEY` (or `SMTP_*`) and `EMAIL_FROM` so magic-link emails are sent via SendGrid SMTP. Without any email config, the magic-link URL is printed in the terminal in dev — copy it to sign in.

3. **Onboarding → project → ingest key**
   - Create workspace → Create project. On the “Your ingest key” step, **copy the key** (shown once).

4. **SDK → events in dashboard**
   - From repo root:
     ```bash
     DEPENDWATCH_INGEST_KEY=<paste key> INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts
     ```
   - Open the project dashboard; switch to 24h/7d if needed. You should see real events (calls, providers, latency, cost).

5. **Stripe checkout**
   - Go to **Billing** for your workspace. Click “Upgrade to Builder” (requires `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP` in `.env`).
   - Complete checkout in Stripe test mode (card `4242 4242 4242 4242`).
   - You should be redirected to Billing with “Subscription updated successfully” and the current plan reflecting Builder.

**Stripe webhooks locally**: Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET` to the CLI’s webhook secret so the app receives `checkout.session.completed`.

---

## Launch verification (exact commands & verdict)

Use this as the single runbook to verify the 4 launch flows before going live.

### 1. Exact environment variables required

**Minimum to run the app (signup + dashboard + ingest):**

| Variable | Required | Example / note |
|----------|----------|-----------------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/dependwatch` |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes (for OAuth) | `http://localhost:3000` |

**Sign-in (pick one or more):**

| Variable | Required if | Example |
|----------|-------------|---------|
| `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` | Using Google | Google Cloud OAuth client |
| `AUTH_GITHUB_ID` + `AUTH_GITHUB_SECRET` | Using GitHub | GitHub OAuth app |
| `SENDGRID_API_KEY` or `SMTP_*` + `EMAIL_FROM` | Sending magic-link email | SendGrid: `SENDGRID_API_KEY=SG.xxx`. Or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. |
| `AUTH_RESEND_KEY` (+ `EMAIL_FROM`) | Magic-link fallback if no SMTP | Resend API key. In dev with no SMTP/Resend, magic link URL is printed in the terminal. |

**Stripe (only for testing checkout):**

| Variable | Required for checkout | Example |
|----------|------------------------|---------|
| `STRIPE_SECRET_KEY` | Yes | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes (local: from Stripe CLI) | `whsec_...` |
| `STRIPE_PRICE_BUILDER` | Yes | `price_...` (Stripe Dashboard) |
| `STRIPE_PRICE_STARTUP` | Yes | `price_...` |
| `NEXT_PUBLIC_APP_URL` | Yes for redirects | `http://localhost:3000` |

**Ingestion (optional for app; needed for SDK/script):**

| Variable | Used by | Example |
|----------|---------|---------|
| `DEPENDWATCH_INGEST_KEY` | Sample script only | Your project ingest key (copy from UI) |
| `INGEST_URL` | Sample script only | `http://localhost:3000` (default) |
| `DEPENDWATCH_INGEST_URL` | SDK only | `http://localhost:3000` when self-hosting |

Create `apps/web/.env` from `.env.example` and set the above. Do **not** commit `.env`.

### 2. Exact local test commands

From the **repo root** (`dependwatch/`):

```bash
# Install
npm install

# Database (first time only)
cd apps/web && npx prisma migrate dev && npx prisma db seed && cd ../..

# Start app
npm run dev
```

Then in **another terminal** (for sample events, after you have an ingest key):

```bash
# Replace YOUR_INGEST_KEY with the key from the onboarding "Your ingest key" step
DEPENDWATCH_INGEST_KEY=YOUR_INGEST_KEY INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts
```

For **Stripe checkout** (in a second terminal while app is running):

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook signing secret (whsec_...) into apps/web/.env as STRIPE_WEBHOOK_SECRET
```

### 3. Exact sequence to test all 4 flows

1. **Signup**
   - Open http://localhost:3000 → click “Start Monitoring APIs” or go to http://localhost:3000/login?signup=1.
   - **GitHub**: Click “Continue with GitHub”, authorize. You should land on `/onboarding`.
   - **Magic link (no Resend)**: Enter email → Submit → in the **terminal where `npm run dev` is running**, copy the printed URL (e.g. `http://localhost:3000/api/auth/callback/email?token=...`) and open it in the browser. You should land on `/onboarding`.
   - **Magic link (with Resend)**: Enter email → check inbox → click link → land on `/onboarding`.

2. **Onboarding and ingest key**
   - Create workspace (e.g. “My Workspace”) → Continue.
   - Create project (e.g. “My Project”) → Continue.
   - On “Your ingest key”, **copy the full key** (starts with `dw_live_`). Click “Go to dashboard”.
   - You should be on `/dashboard/<workspaceId>/<projectId>` with empty state “No API events yet”.

3. **Ingestion and dashboard**
   - In a new terminal:  
     `DEPENDWATCH_INGEST_KEY=<paste key> INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts`  
   - You should see “Sent 6 events”.
   - In the browser, stay on the project dashboard. Within a few seconds it will auto-refresh (or change range to 24h). You should see Total calls, providers (openai, stripe, resend, twilio), and charts with data.

4. **Stripe checkout**
   - Ensure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP`, `NEXT_PUBLIC_APP_URL` are set in `apps/web/.env`.
   - Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET` in `.env` to the CLI secret.
   - In the app: open **Billing** (sidebar or `/dashboard/<workspaceId>/billing`). Click “Upgrade to Builder ($29/mo)”.
   - Complete Stripe Checkout (test card `4242 4242 4242 4242`).
   - You should be redirected to Billing with “Subscription updated successfully” and **Current plan: Builder**.

### 4. Go / no-go launch verdict

| Flow | Go if… |
|------|--------|
| **SDK working** | Sample script returns “Sent 6 events” and ingest API returns 200 for `POST /api/ingest` with Bearer key. |
| **Events visible in dashboard** | After running the script, the project dashboard shows real totals, provider table, and charts (no manual refresh needed for empty state; it polls every 5s). |
| **Signup working** | You can sign in via Google, GitHub, or magic link and land on onboarding, then dashboard, with session persisting. |
| **Stripe checkout working** | Upgrade opens Stripe Checkout; after payment you return to Billing and see the new plan without refreshing. |

**Go for launch** when all four rows above pass on your target environment (local and/or production). If any row fails, fix that flow before launch.

### Auth: Google OAuth and SendGrid SMTP

- **Google OAuth**: Create a OAuth 2.0 Client ID (Web application) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Set authorized redirect URI to `https://your-domain.com/api/auth/callback/google` (or `http://localhost:3000/api/auth/callback/google` for local). Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.
- **SendGrid SMTP**: In [SendGrid](https://sendgrid.com), create an API key with “Mail Send” permission. Set `SENDGRID_API_KEY` to that key and `EMAIL_FROM` to a verified sender (e.g. `DependWatch <noreply@yourdomain.com>`). Magic-link emails are sent over SMTP (port 587, `smtp.sendgrid.net`, user `apikey`). No code change needed for other SMTP providers — set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` instead.

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Secret for session signing |
| `NEXTAUTH_URL` | App URL (e.g. `http://localhost:3000`). Use `https://` in production so session cookies are secure and sessions persist (30-day rolling). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth (optional) |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth (optional) |
| `SENDGRID_API_KEY` | SendGrid API key for magic-link email via SMTP (recommended) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Generic SMTP (e.g. SendGrid: host `smtp.sendgrid.net`, port 587, user `apikey`, pass = API key) |
| `AUTH_RESEND_KEY` | Resend API key (optional fallback if SMTP not set) |
| `EMAIL_FROM` | From address for emails (e.g. `DependWatch <noreply@yourdomain.com>`) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_BUILDER` / `STRIPE_PRICE_STARTUP` | Stripe Price IDs for plans |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `NEXT_PUBLIC_APP_URL` | Public app URL for redirects |
| `DEPENDWATCH_INGEST_URL` | Ingestion API base URL (SDK; default from env or app URL) |

## Production deployment (e.g. Vercel + Postgres)

1. **Database**: Create a Postgres database (e.g. Vercel Postgres, Neon, Supabase). Set `DATABASE_URL`.
2. **Auth**: Set `NEXTAUTH_URL` to your production HTTPS URL (e.g. `https://app.dependwatch.app`) and ensure `NEXTAUTH_SECRET` is set. Sessions are 30-day max with rolling refresh on use; cookies are secure when URL is HTTPS. For magic-link email use SendGrid SMTP (`SENDGRID_API_KEY` + `EMAIL_FROM`). Optionally set `AUTH_GOOGLE_*` and/or `AUTH_GITHUB_*` for OAuth.
3. **Stripe**: Create products/prices for Builder and Startup; set `STRIPE_PRICE_*`. Configure webhook to `https://your-domain.com/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET`.
4. **Deploy**: Connect the repo to Vercel, set env vars, deploy. Run migrations (e.g. in build or a one-off): `npx prisma migrate deploy`.
5. **Cron (optional)**: To run alert evaluation on a schedule, call `POST /api/cron/alerts` with a cron secret (implement if needed).

## What’s production-ready

- Marketing site, pricing, docs
- Auth (Google, GitHub, magic link via SendGrid SMTP or Resend), onboarding, workspace/project model
- Ingest API (validation, rate limiting, batching)
- Node SDK (track, wrap, span, batching, retries)
- Dashboard (KPIs, charts, by-provider table, recent failures)
- Project settings (name, API key create/revoke)
- Stripe checkout and webhook for subscription sync
- Health endpoint at `/api/health`
- Provider catalog seed and cost projection
- **MCP (Model Context Protocol)** for Cursor / Claude Code: connect your coding assistant to DependWatch (search docs, list projects, send test events, view metrics). Create MCP tokens in **Project → Connect assistant** or **Settings**; use the token in your editor’s MCP config with the app’s `/api/mcp` URL.

## Test readiness checklist

Before founder or beta testing, run through the step-by-step checklist:

- **[docs/TEST_READINESS_CHECKLIST.md](docs/TEST_READINESS_CHECKLIST.md)** — Auth, onboarding, SDK, dashboard, billing, docs, MCP, health.

## Launch-readiness checklist

Before going live:

- [ ] Set all required env vars (see table above); generate `NEXTAUTH_SECRET`.
- [ ] Run `npx prisma migrate deploy` and `npx prisma db seed` against production DB.
- [ ] Create Stripe products/prices for Builder and Startup; set `STRIPE_PRICE_BUILDER` and `STRIPE_PRICE_STARTUP`.
- [ ] Configure Stripe webhook to `https://your-domain.com/api/webhooks/stripe`; set `STRIPE_WEBHOOK_SECRET`.
- [ ] Set `NEXTAUTH_URL` to your production URL.
- [ ] Configure magic-link email: set `SENDGRID_API_KEY` (or SMTP_*) and `EMAIL_FROM` to a verified sender. Optional fallback: `AUTH_RESEND_KEY`.
- [ ] (Optional) Set `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` and/or `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` for OAuth.
- [ ] Verify `/api/health` returns 200.
- [ ] Test sign-up → onboarding → create project → copy key → send sample events → view dashboard.
- [ ] Test upgrade flow: Billing → Upgrade to Builder/Startup → Stripe checkout → return to Billing with success.

## Connect your coding assistant (MCP)

DependWatch can connect to **Cursor** and **Claude Code** so your assistant can search docs, list projects, send test events, and view metrics. The feature is called “Connect your coding assistant” in the app.

### 1. Exact local setup steps

1. **Start the app** (from repo root):
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

2. **Sign in** and open any project (create a workspace + project if needed).

3. **Create an access token**  
   Go to **Settings** (or header **Connect assistant**) → **Set up connection** (or open `/dashboard/<workspaceId>/<projectId>/mcp`).  
   Step 1: Enter a token name (e.g. `Cursor local`) → **Create token**.  
   **Copy the token immediately** — it is shown only once.

4. **Add the MCP config** to your editor (see snippets below). Use `http://localhost:3000` as the base URL and paste your token where indicated.

5. **Restart Cursor or Claude Code** after saving the config.

6. **Run the database migration** if you haven’t yet (required for tokens):
   ```bash
   cd apps/web && npx prisma migrate deploy && npx prisma generate
   ```

### 2. Exact Cursor config snippet

Create or edit `.cursor/mcp.json` in your project (or use Cursor **Settings → Tools & MCP → Add new MCP server**). For **local** dev:

```json
{
  "mcpServers": {
    "dependwatch": {
      "type": "streamableHttp",
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token you copied from the DependWatch setup page. For production, use your app URL (e.g. `https://app.dependwatch.app/api/mcp`).

### 3. Exact Claude Code config snippet

If your Claude client supports URL-based MCP servers, use JSON like this (config file location depends on the client — e.g. Claude Desktop uses `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "dependwatch": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
      }
    }
  }
}
```

Replace `YOUR_ACCESS_TOKEN_HERE` with your token. For production, use your app URL.

### 4. Example prompts to test the integration

- **Docs (no token required):**  
  - “Search DependWatch docs for OpenAI integration.”  
  - “Show me the Node SDK quickstart for DependWatch.”  
  - “What’s the Stripe example for DependWatch?”

- **Projects (token required):**  
  - “List my DependWatch projects.”  
  - “What’s the setup status for my DependWatch project?”  
  - “Send a test event to my DependWatch project.”  
  - “Show latest provider metrics for my project.”

### 5. Tools and security

- **Public tools (no auth):** `search_docs`, `get_quickstart`, `get_sdk_install`, `get_provider_example`, `get_setup_steps`, `get_api_reference_summary`
- **Authenticated tools (token with scopes):** `list_workspaces`, `list_projects`, `get_project_setup_status`, `send_test_event`, `get_project_overview`, `get_latest_provider_metrics`

Tokens are scoped by workspace (optional), stored as a hash, shown once on creation, and can be revoked. Ingest keys are never exposed via this integration.

### 6. Go / no-go verdict (coding assistant integration)

| Check | Go if… |
|-------|--------|
| **Docs tools** | “Search DependWatch docs for OpenAI” returns relevant snippets. |
| **Auth tools** | With a valid token, “List my DependWatch projects” returns your projects. |
| **Test event** | “Send a test event to my project” succeeds and dashboard shows new events. |
| **Token security** | Token is hashed, shown once, and revoke works from the setup page. |

**Go** when the above pass locally (and in production if you use a deployed URL).

---

## Suggested V2

- Full alert evaluation cron + email/Slack delivery with deduplication
- Slack webhook config UI for Startup plan
- Provider detail page (p50/p95/p99, cost over time)
- Project-level provider cost overrides UI
- Team invitations and workspace members
- Usage limits enforced by plan (e.g. max providers, retention)
- CSV export of events
- Anomaly detection badges
