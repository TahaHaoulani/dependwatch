import Link from 'next/link';
import { auth } from '@/lib/auth-server';
import { Button } from '@/components/ui/button';
import { MarketingHeader } from '@/components/marketing/marketing-header';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { DocSection } from '@/components/docs/doc-section';
import { CodeBlock } from '@/components/docs/code-block';
import { DocsNav } from '@/components/docs/docs-nav';

export default async function DocsPage() {
  const session = await auth();
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader isAuthenticated={!!session?.user} />

      <div className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-16 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <DocsNav />
          </aside>

          <main className="min-w-0 max-w-3xl">
            <div className="mb-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Documentation</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                DependWatch Docs
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Observability for every API and tool your software depends on—including the ones your AI agents call. Latency, failures, cost, insights, guardrails, dependency map. First insight in under two minutes.
              </p>
            </div>

            {/* ========== Getting Started ========== */}
            <DocSection id="quickstart" title="Quickstart">
              <p>
                Get your first event and insight into the DependWatch dashboard in under two minutes.
              </p>
              <ol className="list-decimal space-y-2 pl-6">
                <li><strong>Create an account</strong> — Sign in with Google, GitHub, or magic link.</li>
                <li><strong>Create a workspace and project</strong> — Onboarding guides you; the project gets a default ingest key.</li>
                <li><strong>Copy your ingest key</strong> — Shown once when you create the project. Store it as <code>DEPENDWATCH_INGEST_KEY</code> in your environment.</li>
                <li><strong>Send a test event (optional)</strong> — From the empty dashboard, click &quot;Send a test event&quot; to see the ingestion stream and watch the dashboard populate with real metrics. Events usually appear within a few seconds.</li>
                <li><strong>Install the SDK</strong> — <code>npm install @dependwatch/sdk-node</code>.</li>
                <li><strong>Initialize and wrap</strong> — Call <code>init()</code> at startup, then wrap your first API call with <code>wrap()</code>.</li>
                <li><strong>See events and insights</strong> — Events are batched and sent automatically; the dashboard shows calls, latency, error rate, projected cost, and auto-generated insights and guardrails.</li>
              </ol>
            </DocSection>

            <DocSection id="install" title="Installation">
              <p>Install the DependWatch Node SDK from npm. Use it in Node.js (server-side) only; never expose your ingest key in client-side code.</p>
              <CodeBlock
                code={`npm install @dependwatch/sdk-node

# or
yarn add @dependwatch/sdk-node
pnpm add @dependwatch/sdk-node`}
                language="bash"
              />
            </DocSection>

            <DocSection id="project-key" title="Create Project & API Key">
              <p>
                In the dashboard, create a <strong>workspace</strong> (e.g. your company) and a <strong>project</strong> (e.g. an app or service). When you create a project, we generate a default <strong>ingest key</strong>. You can create more keys in <strong>Project → Settings → Ingest API keys</strong>.
              </p>
              <p>
                Keep keys secret. Use environment variables (e.g. <code>DEPENDWATCH_INGEST_KEY</code>) and never commit them. The full key is shown only once when you create or rotate it.
              </p>
            </DocSection>

            <DocSection id="send-first-event" title="Send Your First Event">
              <p>After <code>init()</code>, wrap any async external API call with <code>wrap()</code>. DependWatch measures duration and success and sends an event to the ingest API. Events are batched and flushed on an interval (default 5 seconds) or when the batch is full. <strong>ingestKey is required</strong> — set <code>DEPENDWATCH_INGEST_KEY</code> in your environment.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,  // required
});

await wrap(
  { provider: "openai", endpoint: "chat.completions" },
  async () => {
    return openai.chat.completions.create({ model: "gpt-4", messages });
  }
);`}
                language="typescript"
              />
              <p>Refresh your project dashboard (or wait for auto-refresh); you should see the call count, latency, and optional cost.</p>
            </DocSection>

            {/* ========== SDK ========== */}
            <DocSection id="sdk-overview" title="SDK Overview">
              <p>
                The <strong>Node SDK</strong> (<code>@dependwatch/sdk-node</code>) lets you instrument external API calls in two ways:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>wrap(options, fn)</strong> — Wraps an async function, measures duration and success/failure, and sends one event per call. Recommended for most use cases.</li>
                <li><strong>track(event)</strong> — Sends a single event with pre-measured fields (e.g. when you already have duration from middleware).</li>
              </ul>
              <p>Events are queued in memory and sent in batches to the <strong>Ingest API</strong> (<code>POST /api/ingest</code>). Batching and retries are built in; you only need to call <code>init()</code> once and then <code>wrap()</code> or <code>track()</code>.</p>
            </DocSection>

            <DocSection id="initialize-sdk" title="Initialize SDK">
              <p>Call <code>init()</code> once at application startup, before any <code>wrap()</code> or <code>track()</code>. Pass your project&apos;s ingest key (and optionally base URL, environment, or batching options).</p>
              <CodeBlock
                code={`import { init } from "@dependwatch/sdk-node";

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
  baseUrl: "https://app.dependwatch.app",  // optional; default or DEPENDWATCH_INGEST_URL
  environment: "prod",                      // optional: dev | staging | prod | test
  flushIntervalMs: 5000,                     // optional; default 5000
  maxBatchSize: 50,                         // optional; default 50
});`}
                language="typescript"
              />
              <p>If you use a self-hosted or local app, set <code>baseUrl</code> to your app URL (e.g. <code>http://localhost:3000</code>). The SDK uses <code>DEPENDWATCH_INGEST_URL</code> or <code>NEXT_PUBLIC_APP_URL</code> if <code>baseUrl</code> is not provided.</p>
            </DocSection>

            <DocSection id="wrapping-api-calls" title="Wrapping API Calls">
              <p>Use <code>wrap(options, fn)</code> to wrap any async call. The SDK starts a span, runs your function, records duration and success (or failure with status code and error type/message), and enqueues an event. Options include <code>provider</code>, <code>endpoint</code>, optional <code>method</code>, and optional <code>estimated_cost_usd</code> for cost projection.</p>
              <CodeBlock
                code={`import { wrap } from "@dependwatch/sdk-node";

const result = await wrap(
  {
    provider: "openai",
    endpoint: "chat.completions",
    method: "POST",              // optional
    estimated_cost_usd: 0.002,   // optional; for dashboard cost projection
  },
  async () => {
    return openai.chat.completions.create({ model: "gpt-4", messages });
  }
);`}
                language="typescript"
              />
              <p>If the inner function throws, the error is recorded (status code, error type, message) and rethrown. The event is still sent so the dashboard shows the failure.</p>
            </DocSection>

            <DocSection id="providers" title="Providers">
              <p>Events are grouped by <strong>provider</strong> in the dashboard (e.g. openai, stripe, twilio, clerk, resend). You choose the provider string when calling <code>wrap()</code> or <code>track()</code>. Use lowercase; the ingest API normalizes it. There is no fixed list — use any name for custom or third-party APIs. DependWatch supports a broad set of provider categories, whether your calls come from application code or from the tools your AI agents call:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>AI APIs</strong> — OpenAI, Anthropic, Mistral, Google Gemini, Cohere, Replicate, Together AI</li>
                <li><strong>Payments</strong> — Stripe, PayPal, Adyen, Checkout.com</li>
                <li><strong>Messaging</strong> — Twilio, Resend, SendGrid, Mailgun, Vonage</li>
                <li><strong>Auth & Identity</strong> — Clerk, Auth0, Supabase Auth, Firebase Auth, AWS Cognito, Okta</li>
                <li><strong>Cloud & Infrastructure</strong> — AWS, Google Cloud, Azure, Cloudflare, Supabase, Firebase</li>
                <li><strong>Search & Data</strong> — Algolia, Pinecone, Weaviate, Elasticsearch</li>
                <li><strong>Maps</strong> — Google Maps, Mapbox, HERE</li>
                <li><strong>Dev & Platform</strong> — GitHub, GitLab, Vercel, Cloudflare API</li>
                <li><strong>Generic HTTP / fetch</strong> — Any REST API</li>
              </ul>
              <p className="mt-2">Known providers may have default cost models in the catalog; others still get full latency and error metrics.</p>
              <p className="mt-4 text-sm font-medium text-foreground/90">Monitor by provider</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The sections below are dedicated guides for key providers: why to monitor, what DependWatch captures, and a quick instrumentation example. Same pattern applies whether you&apos;re instrumenting a backend service, a SaaS integration, or the tool calls behind an AI agent workflow. Order follows the sidebar (AI → Auth & Identity → Payments → Messaging → Cloud → Generic).
              </p>
            </DocSection>

            {/* ========== AI APIs ========== */}
            <DocSection id="openai" title="Monitor OpenAI API">
              <p>Monitor OpenAI API latency, errors, and cost so you can track usage, catch rate limits and timeouts, and avoid bill spikes. Wrap OpenAI SDK calls (e.g. <code>chat.completions.create</code>, <code>embeddings.create</code>) with <code>wrap()</code> and pass <code>estimated_cost_usd</code> per call for accurate projected spend.</p>
              <p className="mt-2 text-sm text-muted-foreground"><strong>What we capture:</strong> Call count, P50/P95/P99 latency, error rate, status codes, and projected monthly cost. Use guardrails to detect cost spikes and error-rate regressions.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import OpenAI from "openai";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const openai = new OpenAI();

const completion = await wrap(
  {
    provider: "openai",
    endpoint: "chat.completions",
    estimated_cost_usd: 0.002,
  },
  async () => {
    return openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }],
    });
  }
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> You’ll see call count, P95 latency, error rate, and projected API spend for the selected time range.</p>
            </DocSection>

            <DocSection id="anthropic" title="Monitor Anthropic API">
              <p>Monitor Anthropic API latency and failures so you can track Claude usage, catch rate limits, and control cost. Wrap your Anthropic SDK or HTTP calls with <code>wrap()</code> and pass <code>estimated_cost_usd</code> when you know it for accurate projected spend.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import Anthropic from "@anthropic-ai/sdk";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const anthropic = new Anthropic();

const message = await wrap(
  {
    provider: "anthropic",
    endpoint: "messages.create",
    estimated_cost_usd: 0.003,
  },
  async () =>
    anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello" }],
    })
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> You&apos;ll see call count, P95 latency, error rate, and projected API spend. Use guardrails to detect cost spikes and error-rate regressions.</p>
            </DocSection>

            <DocSection id="mistral" title="Monitor Mistral API">
              <p>Monitor Mistral API latency and response times so you can track chat and embedding calls and catch failures early. Wrap Mistral SDK or <code>fetch</code> calls with <code>wrap()</code>.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });

const response = await wrap(
  {
    provider: "mistral",
    endpoint: "chat.completions",
    estimated_cost_usd: 0.0002,
  },
  async () =>
    fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.MISTRAL_API_KEY,
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: [{ role: "user", content: "Hello" }],
      }),
    }).then((r) => r.json())
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Mistral appears in the provider table with latency, error rate, and projected cost when you pass <code>estimated_cost_usd</code>.</p>
            </DocSection>

            <DocSection id="google-gemini" title="Monitor Google Gemini API">
              <p>Monitor Google Gemini API latency and failures for chat and embedding calls. Wrap the Google AI SDK or REST calls with <code>wrap()</code>.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { GoogleGenerativeAI } from "@google/generative-ai";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const result = await wrap(
  {
    provider: "google-gemini",
    endpoint: "generateContent",
    estimated_cost_usd: 0.00025,
  },
  async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    return model.generateContent("Hello");
  }
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Google Gemini shows up with call volume, P95 latency, error rate, and projected spend.</p>
            </DocSection>

            <DocSection id="clerk" title="Monitor Clerk API">
              <p>Monitor Clerk authentication API latency and failures so you know when sign-in, sign-up, or session checks fail. Auth failures are highly visible to users; tracking them in DependWatch helps you react quickly to outages or rate limits.</p>
              <p className="mt-2 text-sm text-muted-foreground"><strong>What we capture:</strong> Call count, latency, error rate, and status codes for every Clerk backend call. Set up error-rate alerts to get notified when auth failures spike.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { createClerkClient } from "@clerk/backend";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

const user = await wrap(
  { provider: "clerk", endpoint: "users.getUser" },
  async () => clerk.users.getUser(userId)
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Clerk appears in the provider table with latency and error rate. Set up error-rate alerts so you&apos;re notified when auth failures spike.</p>
            </DocSection>

            <DocSection id="auth0" title="Monitor Auth0 API">
              <p>Monitor Auth0 API latency and failures so you can detect outages and rate limits before users are locked out. Wrap Auth0 Management API or Authentication API calls (e.g. token exchange, user lookup) with <code>wrap()</code>.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { ManagementClient } from "auth0";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const auth0 = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
});

const users = await wrap(
  { provider: "auth0", endpoint: "users.list", method: "GET" },
  async () => auth0.users.getAll()
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Auth0 shows call volume, P95 latency, and error rate. Use error alerts to get notified when Auth0 error rate exceeds a threshold.</p>
            </DocSection>

            <DocSection id="supabase" title="Monitor Supabase API">
              <p>Monitor Supabase API reliability for database, Auth, and Storage. Auth and database failures directly impact users; tracking them in DependWatch helps you spot outages and latency regressions. Wrap Supabase client calls or REST requests with <code>wrap()</code>.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { createClient } from "@supabase/supabase-js";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const supabase = createClient(url, key);

// Database
const { data } = await wrap(
  { provider: "supabase", endpoint: "from.select", method: "GET" },
  async () => supabase.from("users").select("*").limit(10)
);

// Auth (e.g. server-side session check)
const { data: session } = await wrap(
  { provider: "supabase", endpoint: "auth.getSession" },
  async () => supabase.auth.getSession()
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Supabase appears with call volume, latency, and error rate. Use a consistent <code>endpoint</code> (e.g. <code>auth.getSession</code>, <code>from.select</code>) for operation-level breakdowns on Pro/Scale.</p>
            </DocSection>

            {/* ========== Payments ========== */}
            <DocSection id="stripe" title="Monitor Stripe API">
              <p>Monitor Stripe API latency and failures so checkout and subscription flows stay reliable. Wrap Stripe SDK calls with <code>wrap()</code> and use clear <code>endpoint</code> names (e.g. <code>customers.create</code>, <code>paymentIntents.create</code>) for easier filtering and operation-level analytics.</p>
              <CodeBlock
                code={`import { wrap } from "@dependwatch/sdk-node";

const customer = await wrap(
  { provider: "stripe", endpoint: "customers.create" },
  async () => stripe.customers.create({ email: "user@example.com" })
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Stripe appears in the provider table with call volume, P95 latency, and error rate. Add <code>estimated_cost_usd</code> when you track it for projected spend.</p>
            </DocSection>

            {/* ========== Messaging ========== */}
            <DocSection id="twilio" title="Monitor Twilio API">
              <p>Monitor Twilio API reliability for SMS, voice, and messaging so you can catch delivery failures and rate limits early. Wrap Twilio SDK or HTTP calls with <code>wrap()</code> and pass <code>estimated_cost_usd</code> per message for cost projection.</p>
              <CodeBlock
                code={`import { wrap } from "@dependwatch/sdk-node";

const message = await wrap(
  {
    provider: "twilio",
    endpoint: "messages.create",
    estimated_cost_usd: 0.0079,
  },
  async () => twilioClient.messages.create({ to, from, body })
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Twilio shows up with calls, P95, error rate, and projected spend when cost is provided.</p>
            </DocSection>

            {/* ========== Cloud ========== */}
            <DocSection id="aws" title="Monitor AWS APIs">
              <p>Monitor AWS API dependencies (S3, DynamoDB, Lambda, Bedrock, etc.) so you can see latency, errors, and cost in one place. Wrap AWS SDK v3 calls with <code>wrap()</code> using a consistent <code>provider</code> name per service (e.g. <code>aws-s3</code>, <code>aws-dynamodb</code>, <code>aws-bedrock</code>) for clearer breakdowns.</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const s3 = new S3Client({ region: "us-east-1" });

const result = await wrap(
  { provider: "aws-s3", endpoint: "GetObject", method: "GET" },
  async () =>
    s3.send(
      new GetObjectCommand({ Bucket: "my-bucket", Key: "path/to/file.json" })
    )
);`}
                language="typescript"
              />
              <p><strong>In the dashboard:</strong> Each provider name (e.g. aws-s3, aws-bedrock) appears as its own row. Use operation-level analytics (Pro/Scale) to see per-endpoint latency and errors.</p>
            </DocSection>

            {/* ========== Generic ========== */}
            <DocSection id="generic" title="Generic HTTP / fetch">
              <p>Monitor any REST API by wrapping <code>fetch()</code> or your HTTP client with <code>wrap()</code>. Specify <code>provider</code> and <code>endpoint</code> (and optionally <code>method</code>) so the dashboard groups and labels correctly.</p>
              <CodeBlock
                code={`import { wrap } from "@dependwatch/sdk-node";

const data = await wrap(
  { provider: "resend", endpoint: "emails.send", method: "POST" },
  async () =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, body }),
    }).then((r) => r.json())
);`}
                language="typescript"
              />
              <p>Same pattern for Resend, SendGrid, Supabase, or any REST API. Use a consistent provider name so metrics aggregate in one row.</p>
            </DocSection>

            {/* ========== Observability ========== */}
            <DocSection id="dashboard-metrics" title="Dashboard Overview">
              <p>The project dashboard shows high-level metrics for the selected time range (24h, 7d, 30d):</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Total calls</strong> — Sum of instrumented API calls.</li>
                <li><strong>Avg latency</strong> — Average response time across events with <code>duration_ms</code>.</li>
                <li><strong>Error rate</strong> — Fraction of calls where <code>success</code> is false.</li>
                <li><strong>Projected monthly cost</strong> — Extrapolated from total cost in the period (see Cost Estimation).</li>
              </ul>
              <p>Charts include <strong>call volume</strong> over time (bar) and <strong>average latency</strong> over time (line). The dashboard auto-refreshes when there is no data yet (e.g. right after onboarding).</p>
            </DocSection>

            <DocSection id="latency-tracking" title="Latency Tracking">
              <p>When you use <code>wrap()</code>, the SDK measures duration automatically. When you use <code>track()</code>, you pass <code>duration_ms</code> yourself. The dashboard computes <strong>average</strong>, <strong>P50</strong>, <strong>P95</strong>, and <strong>P99</strong> latency per project and per provider. These appear in the overview KPIs and in the per-provider table.</p>
            </DocSection>

            <DocSection id="error-tracking" title="Error Tracking">
              <p>Success or failure is derived from the wrapped function (throw = failure) or from the <code>success</code> field when using <code>track()</code>. Optional <code>status_code</code>, <code>error_type</code>, and <code>error_message</code> are stored and shown in the dashboard. The dashboard lists <strong>recent failures</strong> and can highlight <strong>error spikes</strong> (periods where a provider’s error rate was unusually high compared to its baseline).</p>
            </DocSection>

            <DocSection id="cost" title="Cost Estimation">
              <p>Cost is tracked per event via <code>estimated_cost_usd</code> (in <code>wrap()</code> options or <code>track()</code> payload). The dashboard sums cost for the selected period and <strong>projects monthly cost</strong> by extrapolating: (total cost in period / days in period) × 30. So for a 7-day range, we take the sum of <code>estimated_cost_usd</code> over those 7 days and multiply by 30/7 to get a projected monthly spend. This appears in the overview KPI, the usage card (“Projected API cost monitored”), and per-provider and per-operation tables. We maintain default cost models for known providers where applicable; you can override per project in provider settings. If you don’t pass cost, the provider row still shows latency and errors; cost appears as — or 0.</p>
            </DocSection>

            <DocSection id="provider-breakdown" title="Provider Breakdown">
              <p>The dashboard includes a <strong>by-provider table</strong>: provider name, call count, P95 latency, error rate, and cost (or projected cost). Providers are detected from the <code>provider</code> field you send. Cost spike detection can highlight providers whose projected spend is up significantly versus the previous period (e.g. +30% or more).</p>
            </DocSection>

            <DocSection id="operations" title="Operation-Level Analytics">
              <p><strong>Pro and Scale only.</strong> Free shows provider-level totals only. On Pro and Scale, DependWatch tracks <strong>operations</strong> (provider + endpoint), e.g. <code>openai.chat.completions</code>, <code>stripe.paymentIntents.create</code>, <code>twilio.messages.create</code>. The <strong>Operations</strong> table shows per-operation metrics: calls, P95 latency, error rate, and projected cost. Click a row to open the operation detail: latency distribution (P50/P95/P99), calls over time, cost trend, and recent failures.</p>
              <p>This lets you identify which exact endpoint is slow, failing, or expensive — so you can optimize the right API calls.</p>
            </DocSection>

            <DocSection id="event-stream" title="Event Stream & Recent Failures">
              <p>The <strong>Event stream</strong> shows recent API events (provider, endpoint, latency, success). The dashboard refreshes periodically when data is present. <strong>Recent failures</strong> lists the latest failed calls with timestamp, provider, endpoint, status code, and error message. Click an event for full details (duration, status, error message, estimated cost).</p>
            </DocSection>

            {/* ========== Insights & Guardrails ========== */}
            <DocSection id="insights" title="API Intelligence (Insights)">
              <p>The dashboard <strong>Insights</strong> card (API Cost Radar) shows auto-generated findings from your events. <strong>Pro and Scale only</strong> (Free shows provider-level metrics and projected spend but not cost-driver or cost-spike insights):</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Cost driver</strong> — A provider or operation accounts for a large share of projected spend (e.g. ≥50%).</li>
                <li><strong>Reliability issue</strong> — Error rate for a provider or operation is elevated (e.g. ≥5%).</li>
                <li><strong>Slow endpoint</strong> — P95 latency for an operation exceeds a threshold (e.g. 2s).</li>
                <li><strong>Cost spike</strong> — Current period cost is ≥50% higher than the previous period (same window length).</li>
              </ul>
              <p className="mt-2">Insights appear as soon as conditions are met; no configuration required.</p>
            </DocSection>

            <DocSection id="guardrails" title="Guardrails">
              <p><strong>Guardrails</strong> surface abnormal API behavior. <strong>Pro and Scale only</strong> (Free does not include guardrails). Each type has a clear trigger:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Cost spike</strong> — Provider cost in the current period is &gt;2.5× the previous period.</li>
                <li><strong>Error spike</strong> — Error rate for a provider/operation is above a threshold (e.g. 5%) with enough calls.</li>
                <li><strong>Latency spike</strong> — P95 latency for an operation exceeds a threshold (e.g. 2s).</li>
                <li><strong>Traffic anomaly</strong> — Call volume for an operation is &gt;3× the baseline (previous period).</li>
              </ul>
              <p className="mt-2">Use guardrails to react to cost explosions, reliability regressions, and unexpected traffic before they impact users or invoices. Pro includes cost, error, and latency spike guardrails; <strong>traffic anomaly</strong> (e.g. call volume &gt;3× baseline) is Scale-only.</p>
            </DocSection>

            {/* ========== Dependency Graph ========== */}
            <DocSection id="dependency-graph" title="Dependency Map">
              <p><strong>Pro and Scale only.</strong> The <strong>Dependency map</strong> shows every external provider and operation your project depends on: call volume, reliability score (1 − error rate), P95 latency, and cost contribution. It is a single view of your API dependency graph — no manual setup. Use it to see which providers and endpoints are critical, which are slow or unreliable, and where cost is concentrated. The dashboard table lists providers with these metrics; operation-level detail is in the Operations table.</p>
            </DocSection>

            <DocSection id="reliability-map" title="Reliability & Cost per Provider">
              <p>In the Dependency map, <strong>reliability</strong> is computed as 1 − error rate (0–100%). A provider at 99% reliability has a 1% error rate. Cost is the sum of <code>estimated_cost_usd</code> for the selected period. Together with latency (P50, P95), this gives you a quick picture of each dependency’s health and impact. Use it to prioritize fixes and to discuss SLAs with providers.</p>
            </DocSection>

            {/* ========== Control & Protection ========== */}
            <DocSection id="control-protection" title="Control & Protection (Foundation)">
              <p>DependWatch today delivers <strong>observability</strong> (metrics, event stream, failures) and <strong>intelligence</strong> (insights, guardrails, dependency map). We do <strong>not</strong> run or enforce retry, fallback, or circuit-breaker logic in your request path. You implement those in your application code; the dashboard and guardrails tell you when a provider is failing or when cost is spiking so you can act. Policy configuration and runtime enforcement are on our roadmap. See Retry & Fallback Patterns for how to implement protection in code today.</p>
            </DocSection>

            <DocSection id="retry-fallback" title="Retry & Fallback Patterns">
              <p>When an external API fails or is slow, you can implement:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>Retry with backoff</strong> — Retry failed calls with exponential backoff (e.g. 1s, 2s, 4s) and a max attempt count. Use <code>wrap()</code> around each attempt so DependWatch records every call; guardrails will surface error spikes if retries explode.</li>
                <li><strong>Fallback</strong> — On failure, call a backup provider or return a cached/default response. Instrument both code paths with <code>wrap()</code> so you see success/failure and cost for primary vs fallback.</li>
                <li><strong>Circuit breaker</strong> — After N failures in a window, stop calling the provider for a cooldown period. Implement in code; use the dashboard to see when a provider is unhealthy so you can tune thresholds.</li>
              </ul>
              <p className="mt-2">DependWatch does not enforce these policies at runtime. Implement them in your app and use the dashboard to monitor provider health and alert when guardrails fire.</p>
            </DocSection>

            {/* ========== Alerts ========== */}
            <DocSection id="alerts" title="Latency Alerts">
              <p>In <strong>Project → Settings</strong> you can configure alert rules. A <strong>latency alert</strong> triggers when the observed latency (e.g. P95) exceeds a threshold (in milliseconds). <strong>Free:</strong> 1 alert rule; delivery is in-app only (no Slack). <strong>Pro:</strong> up to 10 rules and up to 3 Slack webhooks. <strong>Scale:</strong> unlimited rules and Slack webhooks. Add your webhook URL in Project → Settings → Alerts; alerts are sent to Slack when thresholds are exceeded. A <strong>cooldown</strong> (plan-dependent, e.g. 30 min Free, 5 min Pro, 1 min Scale) prevents the same rule from firing repeatedly.</p>
            </DocSection>

            <DocSection id="error-alerts" title="Error Alerts">
              <p>An <strong>error rate alert</strong> triggers when the error rate for the project (or per provider) exceeds a configured percentage. Use it to catch regressions or provider outages. Delivery: Slack only (when webhooks are configured); Free has no webhooks. Same cooldown applies.</p>
            </DocSection>

            <DocSection id="cost-spike-alerts" title="Cost Spike Alerts">
              <p>A <strong>budget alert</strong> triggers when the projected monthly cost exceeds a configured budget (USD). This helps you avoid invoice surprises. Configure the monthly budget in the alert rule; when projected spend crosses it, you get notified via your configured Slack webhooks (Pro/Scale). Cooldown works the same as for latency and error alerts.</p>
            </DocSection>

            {/* ========== API ========== */}
            <DocSection id="ingest-api" title="Ingest API">
              <p>Events are sent to <code>POST /api/ingest</code>. The SDK uses this automatically; you can also send batches from your own code. Authenticate with <code>Authorization: Bearer &lt;ingest_key&gt;</code> or <code>X-DependWatch-Key: &lt;ingest_key&gt;</code>. Rate limit: 300 requests per minute per project. Request body: <code>{`{ "events": [ ... ] }`}</code> with 1–100 events per request (see Event Schema).</p>
              <CodeBlock
                code={`const res = await fetch("https://app.dependwatch.app/api/ingest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + process.env.DEPENDWATCH_INGEST_KEY,
  },
  body: JSON.stringify({
    events: [
      {
        provider: "openai",
        endpoint: "chat.completions",
        duration_ms: 1200,
        success: true,
        estimated_cost_usd: 0.002,
      },
    ],
  }),
});`}
                language="typescript"
              />
            </DocSection>

            <DocSection id="event-schema" title="Event Schema">
              <p>Each event in the <code>events</code> array can include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><code>provider</code> (string, required) — e.g. openai, stripe. Max 64 chars; stored lowercase.</li>
                <li><code>timestamp</code> (optional) — ISO string or number (ms). Defaults to now.</li>
                <li><code>endpoint</code> (optional, max 256) — Operation name (e.g. chat.completions, paymentIntents.create). Used for operation-level analytics and insights.</li>
                <li><code>service_name</code> (optional, max 128), <code>method</code> (optional, max 16) — For grouping/labels.</li>
                <li><code>environment</code> (optional) — dev | staging | prod | test.</li>
                <li><code>duration_ms</code> (optional) — Response time in milliseconds. Used for latency percentiles (P50, P95, P99).</li>
                <li><code>status_code</code>, <code>success</code> (optional) — HTTP status and boolean; success defaults from status &lt; 400.</li>
                <li><code>error_type</code>, <code>error_message</code> (optional) — Truncated to 64 / 512 chars. Shown in recent failures and event details.</li>
                <li><code>request_count</code> (optional) — Default 1; 1–10000 for batching multiple logical calls.</li>
                <li><code>estimated_cost_usd</code> (optional) — For cost projection and cost-driver insights.</li>
                <li><code>metadata</code>, <code>region</code> (optional) — Extra context. <code>model</code> and <code>provider_request_id</code> are stored in metadata when provided.</li>
              </ul>
            </DocSection>

            {/* ========== Security ========== */}
            <DocSection id="api-keys" title="API Keys">
              <p><strong>Ingest keys</strong> identify your project when sending events. They are created per project in the dashboard (on project creation or in Project → Settings → Ingest API keys). Each key has a name and a prefix (e.g. <code>dw_live_</code>); the full key is shown only once. Keys are stored as a hash; verification is done by comparing the hash of the provided key. Keep keys secret and use environment variables; never expose them in client-side code or public repos.</p>
            </DocSection>

            <DocSection id="key-rotation" title="Key Rotation">
              <p>You can <strong>create</strong> new ingest keys and <strong>revoke</strong> existing ones from Project → Settings. <strong>Rotate</strong> means creating a new key and revoking the old one in one step (e.g. from the dashboard “Rotate key” action). After rotation, apps still using the old key will get 401 from the ingest API; update them to the new key. The dashboard shows the new key once — copy it immediately.</p>
            </DocSection>

            <DocSection id="environment-variables" title="Environment Variables">
              <p>Use environment variables for all secrets. Recommended: <code>DEPENDWATCH_INGEST_KEY</code> for the ingest key. For self-hosted or local ingest URL, set <code>DEPENDWATCH_INGEST_URL</code> (or the SDK will use <code>NEXT_PUBLIC_APP_URL</code> if set). See Reference → Environment Variables for the full list.</p>
            </DocSection>

            {/* ========== AI Integration ========== */}
            <DocSection id="mcp-integration" title="MCP Integration">
              <p>DependWatch supports the <strong>Model Context Protocol (MCP)</strong> so Cursor and Claude Code can search docs, list projects, send test events, and read metrics. Below: copy-paste setup and per-provider prompts and code so you can integrate in one go.</p>

              <p className="mt-4 font-medium text-foreground">Step 1: Get your MCP token</p>
              <p className="mt-1 text-sm text-muted-foreground">In the app: <strong>Project → Connect assistant</strong> or <strong>Settings</strong>. Create an MCP access token; copy it. You’ll paste it into the config below.</p>

              <p className="mt-6 font-medium text-foreground">Step 2: Cursor — copy-paste config</p>
              <p className="mt-1 text-sm text-muted-foreground">Create or edit <code>.cursor/mcp.json</code> in your project (or use Settings → Tools & MCP → Add new MCP server). Replace <code>YOUR_MCP_ACCESS_TOKEN</code> with your token, then restart Cursor.</p>
              <CodeBlock
                code={`{
  "mcpServers": {
    "dependwatch": {
      "type": "streamableHttp",
      "url": "https://app.dependwatch.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_ACCESS_TOKEN"
      }
    }
  }
}`}
                language="json"
              />

              <p className="mt-6 font-medium text-foreground">Step 3: Claude Code — copy-paste config</p>
              <p className="mt-1 text-sm text-muted-foreground">In your Claude client’s MCP config (e.g. Claude Desktop config file), add the same server. Replace <code>YOUR_MCP_ACCESS_TOKEN</code> with your token and restart.</p>
              <CodeBlock
                code={`{
  "mcpServers": {
    "dependwatch": {
      "type": "streamableHttp",
      "url": "https://app.dependwatch.app/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_ACCESS_TOKEN"
      }
    }
  }
}`}
                language="json"
              />

              <p className="mt-6 font-medium text-foreground">Prompts you can paste (any provider)</p>
              <ul className="list-disc pl-6 space-y-1 mt-1 text-sm text-muted-foreground">
                <li>Search DependWatch docs for OpenAI integration</li>
                <li>List my DependWatch projects</li>
                <li>Send a test event to my DependWatch project</li>
                <li>Show me the latest provider metrics from DependWatch</li>
              </ul>

              <p className="mt-8 font-semibold text-foreground">Per-provider: prompts + copy-paste code</p>
              <p className="mt-1 text-sm text-muted-foreground">Use the prompts in Cursor/Claude, then add the SDK snippet to your app so events show up in DependWatch.</p>

              <p className="mt-4 text-sm font-medium text-foreground">OpenAI</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for OpenAI setup&quot; · &quot;Send a test event for OpenAI&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import OpenAI from "openai";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const openai = new OpenAI();

const completion = await wrap(
  { provider: "openai", endpoint: "chat.completions", estimated_cost_usd: 0.002 },
  async () => openai.chat.completions.create({ model: "gpt-4", messages: [{ role: "user", content: "Hello" }] })
);`}
                language="typescript"
              />
              <p className="mt-1 text-xs text-muted-foreground">Full details: <a href="#openai" className="underline hover:text-foreground">Monitor OpenAI API</a></p>

              <p className="mt-6 text-sm font-medium text-foreground">Google Gemini</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for Gemini&quot; · &quot;Send a test event for Gemini&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { GoogleGenerativeAI } from "@google/generative-ai";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

const result = await wrap(
  { provider: "google-gemini", endpoint: "generateContent", estimated_cost_usd: 0.00025 },
  async () => {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    return model.generateContent("Hello");
  }
);`}
                language="typescript"
              />
              <p className="mt-1 text-xs text-muted-foreground">Full details: <a href="#google-gemini" className="underline hover:text-foreground">Monitor Google Gemini API</a></p>

              <p className="mt-6 text-sm font-medium text-foreground">Anthropic (Claude)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for Anthropic&quot; · &quot;Send a test event for Claude&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import Anthropic from "@anthropic-ai/sdk";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const anthropic = new Anthropic();

const message = await wrap(
  { provider: "anthropic", endpoint: "messages.create", estimated_cost_usd: 0.003 },
  async () => anthropic.messages.create({ model: "claude-3-5-sonnet-20241022", max_tokens: 1024, messages: [{ role: "user", content: "Hello" }] })
);`}
                language="typescript"
              />
              <p className="mt-1 text-xs text-muted-foreground">Full details: <a href="#anthropic" className="underline hover:text-foreground">Monitor Anthropic API</a></p>

              <p className="mt-6 text-sm font-medium text-foreground">Mistral</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for Mistral&quot; · &quot;Send a test event for Mistral&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });

const response = await wrap(
  { provider: "mistral", endpoint: "chat.completions", estimated_cost_usd: 0.0002 },
  async () =>
    fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.MISTRAL_API_KEY },
      body: JSON.stringify({ model: "mistral-small", messages: [{ role: "user", content: "Hello" }] }),
    }).then((r) => r.json())
);`}
                language="typescript"
              />
              <p className="mt-1 text-xs text-muted-foreground">Full details: <a href="#mistral" className="underline hover:text-foreground">Monitor Mistral API</a></p>

              <p className="mt-6 text-sm font-medium text-foreground">xAI (Grok)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for xAI&quot; · &quot;Send a test event for xAI&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });

const response = await wrap(
  { provider: "xai", endpoint: "chat.completions", estimated_cost_usd: 0.001 },
  async () =>
    fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.XAI_API_KEY },
      body: JSON.stringify({ model: "grok-beta", messages: [{ role: "user", content: "Hello" }] }),
    }).then((r) => r.json())
);`}
                language="typescript"
              />

              <p className="mt-6 text-sm font-medium text-foreground">Alibaba (Qwen / DashScope)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for Alibaba Qwen&quot; · &quot;Send a test event for Alibaba&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });

const response = await wrap(
  { provider: "alibaba", endpoint: "chat.completions" },
  async () =>
    fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.DASHSCOPE_API_KEY },
      body: JSON.stringify({ model: "qwen-turbo", messages: [{ role: "user", content: "Hello" }] }),
    }).then((r) => r.json())
);`}
                language="typescript"
              />

              <p className="mt-6 text-sm font-medium text-foreground">Cohere</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prompts to paste: &quot;Search DependWatch docs for Cohere&quot; · &quot;Send a test event for Cohere&quot;</p>
              <CodeBlock
                code={`import { init, wrap } from "@dependwatch/sdk-node";
import { CohereClient } from "cohere-ai";

init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY! });
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY! });

const response = await wrap(
  { provider: "cohere", endpoint: "chat", estimated_cost_usd: 0.0002 },
  async () => cohere.chat({ model: "command", message: "Hello" })
);`}
                language="typescript"
              />

              <p className="mt-6 text-sm text-muted-foreground">Other providers (Azure OpenAI, Together, Replicate, Meta/Llama): use the same pattern. Set <code>provider</code> to a consistent name (e.g. <code>azure-openai</code>, <code>together</code>, <code>replicate</code>, <code>meta</code>) and wrap your API calls with <code>wrap()</code>. No fixed list; the dashboard and guardrails work for any provider.</p>
            </DocSection>

            <DocSection id="llm-providers" title="LLM providers reference">
              <p>Quick reference for provider names and doc links. For copy-paste MCP setup and code, see <a href="#mcp-integration" className="underline hover:text-foreground">MCP Integration</a> above.</p>
              <ul className="list-disc pl-6 space-y-1 mt-2 text-sm text-muted-foreground">
                <li><strong className="text-foreground">OpenAI</strong> — <code>openai</code> · <a href="#openai" className="underline hover:text-foreground">Monitor OpenAI API</a></li>
                <li><strong className="text-foreground">Google Gemini</strong> — <code>google-gemini</code> · <a href="#google-gemini" className="underline hover:text-foreground">Monitor Google Gemini API</a></li>
                <li><strong className="text-foreground">Anthropic</strong> — <code>anthropic</code> · <a href="#anthropic" className="underline hover:text-foreground">Monitor Anthropic API</a></li>
                <li><strong className="text-foreground">Mistral</strong> — <code>mistral</code> · <a href="#mistral" className="underline hover:text-foreground">Monitor Mistral API</a></li>
                <li><strong className="text-foreground">xAI</strong> — <code>xai</code></li>
                <li><strong className="text-foreground">Alibaba / Qwen</strong> — <code>alibaba</code> or <code>qwen</code></li>
                <li><strong className="text-foreground">Cohere</strong> — <code>cohere</code></li>
                <li><strong className="text-foreground">Together AI</strong> — <code>together</code> · <strong className="text-foreground">Replicate</strong> — <code>replicate</code> · <strong className="text-foreground">Azure OpenAI</strong> — <code>azure-openai</code> · <strong className="text-foreground">Meta / Llama</strong> — <code>meta</code> or <code>llama</code></li>
              </ul>
            </DocSection>

            <DocSection id="cursor" title="Using DependWatch in Cursor">
              <p>After adding the DependWatch MCP server (see <a href="#mcp-integration" className="underline hover:text-foreground">MCP Integration</a>), restart Cursor. You can then use prompts like: “Search DependWatch docs for OpenAI integration”, “List my DependWatch projects”, “Send a test event to my project.”</p>
            </DocSection>

            <DocSection id="claude-code" title="Using DependWatch in Claude Code">
              <p>After adding the DependWatch MCP server (see <a href="#mcp-integration" className="underline hover:text-foreground">MCP Integration</a>), restart your Claude client. Use the same prompts as in Cursor to search docs, list projects, send test events, or show metrics.</p>
            </DocSection>

            {/* ========== Concepts ========== */}
            <DocSection id="events" title="Events">
              <p>An <strong>event</strong> is a single recorded API call: provider, timing, success/failure, optional cost and metadata. Events are sent in batches to the ingest API, stored per project, and aggregated for the dashboard (latency percentiles, error rate, cost). Retention depends on your plan (e.g. 7, 90, or 365 days).</p>
            </DocSection>

            <DocSection id="providers-concept" title="Providers">
              <p>A <strong>provider</strong> is the external API or service you’re calling (e.g. openai, stripe, twilio). You set the provider name in each event. The dashboard groups metrics by provider. We maintain a provider catalog with optional default cost models; you can override cost per project in provider settings.</p>
            </DocSection>

            <DocSection id="cost-estimation-concept" title="Cost Estimation">
              <p>Cost is estimated from <code>estimated_cost_usd</code> per event (or from catalog/override rules when applicable). The dashboard sums cost in the selected period and projects monthly cost by extrapolating over 30 days. This gives a “projected API spend” view so you can catch cost spikes before the invoice.</p>
            </DocSection>

            <DocSection id="project-workspace" title="Project & Workspace Model">
              <p><strong>Workspaces</strong> group projects (e.g. one per company or team). <strong>Projects</strong> are the scope for ingest keys, events, and dashboard metrics. One project has one or more ingest keys; all keys for that project send events to the same dataset. Billing is at the workspace level (Stripe subscription); plans define limits such as max providers and retention.</p>
            </DocSection>

            {/* ========== Reference ========== */}
            <DocSection id="sdk-api-reference" title="SDK API Reference">
              <p><strong>init(config)</strong> — <code>config.ingestKey</code> (required), <code>baseUrl</code>, <code>environment</code>, <code>flushIntervalMs</code>, <code>maxBatchSize</code>. Call once at startup. Returns the client instance.</p>
              <p><strong>wrap(options, fn)</strong> — <code>options.provider</code> (required), <code>endpoint</code>, <code>method</code>, <code>estimated_cost_usd</code>, <code>service_name</code>. <code>fn</code> is <code>() =&gt; Promise&lt;T&gt;</code>. Returns the result of <code>fn</code>; on throw, records failure and rethrows.</p>
              <p><strong>track(event)</strong> — <code>event</code> is <code>ApiCallEvent</code> (provider, duration_ms, success, etc.). No return. Call after init; events are queued and sent in batches.</p>
              <p><strong>getClient()</strong> — Returns the current client or null. <strong>Span</strong> / <strong>startSpan(options)</strong> — For manual spans: <code>span.ok(statusCode)</code> or <code>span.fail(statusCode, errorType, errorMessage)</code> and <code>span.end(...)</code>. <strong>trackCompleted(event)</strong> — Convenience to call <code>track</code> without throwing.</p>
            </DocSection>

            <DocSection id="env-vars-ref" title="Environment Variables">
              <p><strong>SDK / app:</strong> <code>DEPENDWATCH_INGEST_KEY</code> — Project ingest key. <code>DEPENDWATCH_INGEST_URL</code> — Base URL for ingest API (e.g. self-hosted). <code>NEXT_PUBLIC_APP_URL</code> — Fallback base URL if ingest URL not set.</p>
              <p><strong>Server (Next.js app):</strong> <code>DATABASE_URL</code>, <code>NEXTAUTH_SECRET</code>, <code>NEXTAUTH_URL</code>, <code>AUTH_GOOGLE_ID</code> / <code>AUTH_GOOGLE_SECRET</code>, <code>AUTH_GITHUB_ID</code> / <code>AUTH_GITHUB_SECRET</code>, <code>SENDGRID_API_KEY</code> or <code>SMTP_*</code>, <code>EMAIL_FROM</code>, <code>AUTH_RESEND_KEY</code>, <code>STRIPE_*</code>, <code>NEXT_PUBLIC_APP_URL</code>. See README or .env.example for the full list.</p>
            </DocSection>

            <DocSection id="limits" title="Limits">
              <p><strong>Ingest API:</strong> 300 requests per minute per project; 1–100 events per request. Event field limits: provider 64 chars, endpoint 256, method 16, error_type 64, error_message 512, request_count 1–10000.</p>
              <p><strong>Plans (usage-based):</strong></p>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                <li><strong>Free</strong> — 10,000 events/month, <strong>2 APIs</strong> (distinct providers), <strong>7-day event history</strong>, 1 alert rule (no Slack). Dashboard shows provider-level metrics and projected spend. No Operations table, no guardrails, no cost-spike detection.</li>
                <li><strong>Pro</strong> ($29/mo) — 100,000 events/month, 10 APIs, 90-day event history, up to 10 alert rules and 3 Slack webhooks. Adds: Operations table (per-endpoint analytics), cost-spike guardrails, cost-driver insights, guardrails (cost/error/latency/traffic), digest delivery via cron. No anomaly detection.</li>
                <li><strong>Scale</strong> ($99/mo) — 1,000,000 events/month, unlimited APIs, 365-day event history, <strong>unlimited alert rules and Slack webhooks</strong>, anomaly detection. Everything in Pro plus 1-year retention.</li>
              </ul>
              <p className="mt-3"><strong>Event history</strong> = how long we keep your event data for charts, trends, and debugging. <strong>APIs monitored</strong> = distinct providers you send events for (e.g. OpenAI, Stripe). Upgrade when you need more APIs, longer history, or Slack alerts. See <Link href="/pricing" className="underline hover:text-foreground">Pricing</Link> for the full comparison.</p>
            </DocSection>

            <div className="mt-16 border-t border-border pt-8">
              <Link href="/login?signup=1">
                <Button>Get started</Button>
              </Link>
            </div>
          </main>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
