/**
 * Example: instrument OpenAI API calls with DependWatch
 * Run with: npx ts-node examples/openai.ts (after setting DEPENDWATCH_INGEST_KEY)
 */
import { init, wrap } from '../src';

init({
  ingestKey: process.env.DEPENDWATCH_INGEST_KEY!,
  environment: 'dev',
});

async function main() {
  // Simulated OpenAI call
  const result = await wrap(
    {
      provider: 'openai',
      endpoint: 'chat/completions',
      estimated_cost_usd: 0.002,
    },
    async () => {
      await new Promise((r) => setTimeout(r, 150));
      return { choices: [{ message: { content: 'Hello' } }] };
    }
  );
  console.log(result);
}

main().catch(console.error);
