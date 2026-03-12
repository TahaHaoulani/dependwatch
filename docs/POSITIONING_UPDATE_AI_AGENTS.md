# DependWatch — Positioning Update: AI Agent Use Case (Mar 2025)

This document summarizes the product wording and positioning update that expands DependWatch’s narrative to include **AI agents and agent tool calls** without narrowing the product to an “AI-only” observability tool.

---

## 1. Positioning Summary

### Old narrative
- **Hero:** “The control plane for external APIs” / “One place to see and protect every API your product calls.”
- **Focus:** External API observability for modern SaaS (Stripe, Twilio, OpenAI, etc.).
- **Tone:** Broad but did not explicitly name AI agents or agent workflows as a use case.

### New narrative
- **Core category unchanged:** Observability for the **external APIs and tools your software depends on**.
- **Expansion:** AI agents are introduced as a **high-value use case**, not the product’s sole identity.
- **Framing:** “From SaaS integrations like Stripe and Twilio to the tools your AI agents call.”

### Why it is stronger
- **TAM preserved:** Messaging still speaks to SaaS teams, backend developers, integrations, and AI builders.
- **Category-defining:** “APIs and tools your software depends on” keeps the broad dependency layer front and center.
- **AI-agent relevance:** Clear, credible inclusion of agent workflows and tool calls where they naturally fit (hero, problem, use cases, docs, pricing).
- **No niche shrink:** DependWatch is not repositioned as “AI agent observability” or “LLM tracing”; it remains the broad external-dependency observability platform with strong relevance to agents.

---

## 2. Key Surfaces Updated

| Surface | Changes |
|--------|--------|
| **Landing hero** | Tagline → “Observability for the APIs and tools your software depends on.” Headline → “Monitor every external API your product calls — and the tools your AI agents call.” Subheads reference “From SaaS integrations… to the APIs behind agent workflows.” |
| **Landing problem** | “Modern SaaS — and the AI agents and workflows you build — run on external APIs and tools.” Dependency card mentions “Products — and agent workflows — rely on dozens of APIs.” Closing line adds “including the ones their AI agents call.” |
| **Landing features / platform** | Intro: “One control plane for SaaS integrations, AI APIs, **agent tool calls**, payments, auth, messaging…” “Works with… any HTTP API or tool your software — or your AI agents — calls.” |
| **Landing comparison (APM)** | “Every third-party API and tool your app — or your agents — call.” |
| **Landing use cases / incidents** | New incident card: “Agent workflow dependency failures” — when workflows span OpenAI, Notion, Slack, internal APIs, see which dependency failed. Closing line: “including the ones your AI agents call.” |
| **Landing pricing** | “Scales with your API traffic — SaaS apps, integrations, and agent workflows.” |
| **Landing final CTA** | “See every external API and tool dependency…” “From SaaS integrations to the tools your agents call…” |
| **Docs homepage** | Doc hero: “Observability for the APIs and tools your software depends on — from SaaS integrations to the tools your AI agents call.” Providers section: “whether your calls come from application code or from AI agent tool calls and multi-step workflows.” Monitor-by-provider: “Same pattern applies whether you’re instrumenting a backend service, a SaaS integration, or the tool calls behind an AI agent workflow.” |
| **Quickstart (landing)** | “Monitor real traffic — whether from your backend, integrations, or agent tool calls.” |
| **Dashboard empty state** | “One place for latency, failures, and cost across every **external API and tool**.” “Send events from your app **or agent workflows** (SDK)…” Success: “DependWatch is now monitoring your **external APIs and tools**.” Next step: “wrap your external API calls — from your app or from agent tool calls.” |
| **Pricing page** | Hero: “For SaaS apps, integrations, and agent workflows.” Scale subtitle: “agent workflows” and “full external dependency observability.” Trust: “Built for modern API-driven stacks — SaaS, integrations, and agent workflows.” “including the tools your AI agents call.” |
| **Typical usage (pricing)** | Production scenario: apis include “Agent tools”; explanation references “agent workflows” and “full external dependency observability.” |
| **Layout (metadata)** | Title: “Observability for the APIs and tools your software depends on.” Description: “Monitor external APIs and tools… from SaaS integrations to the ones your AI agents call.” |
| **Marketing footer** | Tagline: “Observability for the APIs and tools your software depends on — including the ones your AI agents call.” Copyright: “SaaS, integrations, and agent dependencies.” |

---

## 3. Wording Themes Introduced

### Broad external dependency framing
- “APIs and tools your software depends on”
- “External API and tool”
- “Third-party API and tool”
- “SaaS integrations, AI APIs, agent tool calls”
- “Full external dependency observability”

### AI-agent use-case framing (secondary)
- “The tools your AI agents call”
- “Agent workflows” / “agent tool calls”
- “When agent workflows span OpenAI, Notion, Slack, and internal APIs…”
- “From your app or from agent tool calls”
- “Whether your calls come from application code or from AI agent tool calls and multi-step workflows”

### What we avoided
- “AI agent observability platform”
- “Built for agent observability”
- “LLM tracing” / “AI-only monitoring”
- Vague buzzwords (agentic, orchestration fabric, etc.)

---

## 4. Files Changed

- `apps/web/src/app/page.tsx` — Hero, trust bar, problem, comparison, platform intro, works-with, incident scenarios (+1 card), incident closing, pricing intro, final CTA, quickstart.
- `apps/web/src/app/layout.tsx` — Metadata title and description.
- `apps/web/src/components/marketing/marketing-footer.tsx` — Footer tagline and copyright.
- `apps/web/src/app/docs/page.tsx` — Docs hero, Providers section, Monitor-by-provider.
- `apps/web/src/app/pricing/page.tsx` — Hero, Scale subtitle, trust section.
- `apps/web/src/components/pricing/typical-usage.tsx` — Production scenario (apis + explanation).
- `apps/web/src/components/dashboard/dashboard-empty-state.tsx` — Headline, subtext, success message, next-step card.

---

## 5. Success Criteria Met

- DependWatch now **clearly includes AI-agent relevance** in hero, problem, use cases, docs, pricing, and onboarding.
- The **core narrative stays broad** (“APIs and tools your software depends on”).
- **TAM is not narrowed** — no repositioning as an AI-only or agent-only product.
- Copy is **more modern and strategically stronger** with a clear “from X to Y” expansion (SaaS → agent tools).
- Wording remains **crisp, premium, and DevTools-native** (latency, failures, cost, guardrails, dependency map).

---

## 6. Second pass — Positioning sharpness

A follow-up pass tightened the copy so the product consistently reads as **“the observability layer for the APIs and tools your software depends on — including the ones your AI agents call.”**

### Changes made
- **Hero:** Tagline set to “The observability layer for the APIs and tools your software depends on.” Headline to “One place to see every external API and tool your software depends on — including the ones your AI agents call.” Subhead leads with “Latency, failures, cost…” and “Built for the dependency layer: SaaS integrations, AI APIs, and the tools your AI agents call.”
- **Problem:** Opens with “Your product runs on external APIs and tools you don’t control. So do the AI agents and workflows you build.” First pain card no longer mentions “agent workflows” so the problem stays universal; the solution line keeps “including the ones their AI agents call.”
- **Trust bar, APM comparison, platform intro, works-with, final CTA:** All use the same pattern — “APIs and tools your software depends on — including the ones your AI agents call” (or “the tools your AI agents call”). Removed “your agents” (vague); use “your AI agents” where the extension is named.
- **Platform intro:** “One control plane for the **external APIs your software depends on**: SaaS integrations, AI APIs, payments, auth… — **including the tools your AI agents call**.” No longer lists “agent tool calls” as a peer category to payments/auth.
- **Quickstart:** “From your backend, integrations, or the code that powers your AI agents” (replaces “agent tool calls”).
- **Pricing:** “Built for SaaS apps and integrations — and for the APIs your AI agents call.” Trust section: “SaaS, integrations, and the APIs your AI agents call.” Closing line: “DependWatch is the observability layer for products that depend on these providers and any other HTTP API.”
- **Dashboard empty state:** Lead line no longer says “or agent workflows”; next step says “from your backend, integrations, or the code that powers your AI agents.”
- **Docs:** Hero and providers use “the observability layer” and “including the ones your AI agents call”; providers sentence shortened to “whether your calls come from application code or from the tools your AI agents call.”
- **Layout, footer:** Title and footer tagline use “The observability layer for the APIs and tools your software depends on — including the ones your AI agents call.” Copyright: “SaaS, integrations, and the APIs your AI agents call” (dropped “agent dependencies”).
- **Typical usage / Scale:** Production scenario focuses on “full observability over every external API and tool their software depends on”; removed “Agent tools” from the apis list and “agent workflows” from the explanation to avoid AI-first tone on pricing.

### Result
- Category is clearly **observability layer for external APIs and tools**; AI agents appear as a named extension, not the lead.
- No hype or vague “agent”/“workflow” language; “your AI agents” used only where the extension is explicit.
- Broader SaaS / external API narrative is strengthened; product does not read as AI-only.
