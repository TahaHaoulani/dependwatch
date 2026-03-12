# DependWatch CLI

Quick setup for DependWatch in your project.

## Usage

```bash
npx dependwatch init
```

Without an ingest key, the CLI prints instructions to create a project at [app.dependwatch.app](https://app.dependwatch.app) and get your key.

```bash
npx dependwatch init --ingest-key=dw_live_xxxx
```

With an ingest key, the CLI:

1. Writes `DEPENDWATCH_INGEST_KEY` to your `.env` (or updates it if present)
2. Prints the Node.js quickstart (install SDK, `init`, `wrap`)

## Options

- `--ingest-key=KEY` — Your project ingest key from the DependWatch dashboard
- `--help`, `-h` — Show help

## Get your ingest key

1. Sign in at [app.dependwatch.app](https://app.dependwatch.app)
2. Create or select a project
3. Copy the ingest key from Project → API keys
4. Run `npx dependwatch init --ingest-key=YOUR_KEY`
