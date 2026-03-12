/**
 * Example: instrument generic fetch calls
 */
import { init, wrap } from '../src';

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
});

async function fetchWithTracking(
  provider: string,
  url: string,
  options?: RequestInit
) {
  return wrap(
    { provider, endpoint: url, method: options?.method ?? 'GET' },
    async () => {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
  );
}

fetchWithTracking('custom', 'https://api.example.com/data').then(console.log).catch(console.error);
