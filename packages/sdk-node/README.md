# DependWatch Node SDK

Instrument your Node.js backend to send API call events to DependWatch for latency, error, and cost visibility.

## Install

```bash
npm install @dependwatch/sdk-node
```

## Quick start

1. Create a project in the [DependWatch dashboard](https://app.dependwatch.app) and copy your ingest key.
2. Set `DEPENDWATCH_INGEST_KEY` in your environment (or pass it in code).
3. Initialize and wrap your external API calls.

```ts
import { init, wrap } from '@dependwatch/sdk-node';

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
  environment: 'prod',
});

// Wrap any async call
const data = await wrap(
  { provider: 'openai', endpoint: 'chat/completions' },
  () => openai.chat.completions.create({ model: 'gpt-4', messages: [...] })
);
```

## Manual tracking

```ts
import { startSpan, track } from '@dependwatch/sdk-node';

const span = startSpan({
  provider: 'stripe',
  endpoint: 'customers.create',
});
try {
  const customer = await stripe.customers.create({ email });
  span.ok(200);
} catch (err) {
  span.fail((err as any).statusCode, (err as Error).name, (err as Error).message);
  throw err;
}
```

Or record a completed call:

```ts
track({
  provider: 'resend',
  endpoint: 'emails.send',
  duration_ms: 120,
  success: true,
  status_code: 200,
});
```

## Configuration

- `ingestKey` (required): Project ingest API key from the dashboard.
- `baseUrl`: Ingest API base URL (default: `https://app.dependwatch.app` or `DEPENDWATCH_INGEST_URL`).
- `flushIntervalMs`: Flush batch every N ms (default: 5000).
- `maxBatchSize`: Max events per batch (default: 50).
- `environment`: `dev` | `staging` | `prod` | `test` (default from `NODE_ENV`).

## Behavior

- Events are batched and sent asynchronously; the SDK never blocks or throws on ingest failure.
- Failed sends are retried with exponential backoff (up to 3 times).
- Set `DEPENDWATCH_INGEST_URL` to point to your self-hosted or local ingest endpoint.
