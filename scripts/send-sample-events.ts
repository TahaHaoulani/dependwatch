/**
 * Send sample events to the ingest API for local dashboard testing.
 * Usage: DEPENDWATCH_INGEST_KEY=dw_live_xxx INGEST_URL=http://localhost:3000 npx tsx scripts/send-sample-events.ts
 */
const INGEST_URL = process.env.INGEST_URL ?? 'http://localhost:3000';
const KEY = process.env.DEPENDWATCH_INGEST_KEY;

if (!KEY) {
  console.error('Set DEPENDWATCH_INGEST_KEY to your project ingest key.');
  process.exit(1);
}

const events = [
  { provider: 'openai', endpoint: 'chat/completions', duration_ms: 1200, success: true, estimated_cost_usd: 0.002 },
  { provider: 'openai', endpoint: 'chat/completions', duration_ms: 800, success: true, estimated_cost_usd: 0.001 },
  { provider: 'stripe', endpoint: 'customers.create', duration_ms: 150, success: true },
  { provider: 'resend', endpoint: 'emails.send', duration_ms: 320, success: true, estimated_cost_usd: 0.0001 },
  { provider: 'openai', endpoint: 'chat/completions', duration_ms: 5000, success: false, status_code: 503, error_type: 'TimeoutError' },
  { provider: 'twilio', endpoint: 'messages.create', duration_ms: 180, success: true },
];

async function send() {
  const res = await fetch(`${INGEST_URL}/api/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      events: events.map((e) => ({
        ...e,
        timestamp: new Date().toISOString(),
        environment: 'dev',
      })),
    }),
  });
  if (!res.ok) {
    console.error(await res.text());
    process.exit(1);
  }
  console.log('Sent', events.length, 'events');
}

send();
