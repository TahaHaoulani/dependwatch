#!/usr/bin/env node

/**
 * DependWatch CLI
 * npx dependwatch init [--ingest-key=xxx]
 *
 * - With --ingest-key: writes .env with DEPENDWATCH_INGEST_KEY and prints quickstart.
 * - Without: prints how to get an ingest key and run init again.
 */

const APP_URL = process.env.DEPENDWATCH_APP_URL ?? 'https://app.dependwatch.app';
const DOCS_URL = `${APP_URL.replace(/\/$/, '')}/docs`;

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length).trim();
  }
  return undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

const QUICKSTART = `
# Quickstart (Node.js)

1. Install the SDK:
   npm install @dependwatch/sdk-node

2. In your app entry (e.g. server startup):
   import { init, wrap } from '@dependwatch/sdk-node';
   init({ ingestKey: process.env.DEPENDWATCH_INGEST_KEY });

3. Wrap API calls:
   await wrap(
     { provider: 'openai', endpoint: 'chat.completions', estimated_cost_usd: 0.002 },
     async () => openai.chat.completions.create({ model: 'gpt-4', messages })
   );

Docs: ${DOCS_URL}
`;

function main(): void {
  const ingestKey = getArg('ingest-key');
  const help = hasFlag('help') || hasFlag('h');

  if (help) {
    console.log(`
dependwatch init    Set up DependWatch in your project

Options:
  --ingest-key=KEY   Your project ingest key (from dashboard). If provided, writes .env and shows quickstart.
  --help, -h         Show this help.

Examples:
  npx dependwatch init
  npx dependwatch init --ingest-key=dw_live_xxxx

Get your ingest key: ${APP_URL}
`);
    process.exit(0);
  }

  if (process.argv[2] !== 'init') {
    console.log('Usage: npx dependwatch init [--ingest-key=YOUR_KEY]');
    console.log('Run: npx dependwatch init --help');
    process.exit(1);
  }

  if (ingestKey) {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');
    const line = `DEPENDWATCH_INGEST_KEY=${ingestKey}\n`;
    try {
      let content = '';
      if (fs.existsSync(envPath)) {
        content = fs.readFileSync(envPath, 'utf8');
        if (content.includes('DEPENDWATCH_INGEST_KEY=')) {
          content = content.replace(/DEPENDWATCH_INGEST_KEY=.*(?=\n|$)/g, line.trim());
        } else {
          content = content.trimEnd() + '\n' + line;
        }
      } else {
        content = line;
      }
      fs.writeFileSync(envPath, content);
      console.log('✓ Wrote DEPENDWATCH_INGEST_KEY to .env');
    } catch (err) {
      console.error('Could not write .env:', (err as Error).message);
      process.exit(1);
    }
    console.log(QUICKSTART);
    return;
  }

  console.log(`
DependWatch CLI — init

1. Create a project and get your ingest key:
   ${APP_URL}

2. Run init with your key:
   npx dependwatch init --ingest-key=YOUR_INGEST_KEY

   This will add DEPENDWATCH_INGEST_KEY to your .env and show the quickstart.
`);
}

main();
