# DependWatch Architecture Diagrams

Mermaid diagrams for Excalidraw recreation, team onboarding, investor/product explanation, and AI handoff. Terminology matches **docs/DEPENDWATCH_SOURCE_OF_TRUTH.md**.

---

## 1. High-level system architecture

**What it shows:** Main building blocks and connections (users, app, API, data, Stripe, Slack).  
**Why it matters:** Executive overview; good first diagram for Excalidraw.

```mermaid
flowchart TB
  subgraph Users["Users & integrations"]
    User["User"]
    SDK["SDK in app"]
    MCP["MCP client"]
  end

  subgraph Public["Public"]
    Landing["Landing"]
    Pricing["Pricing"]
    Login["Login"]
  end

  subgraph App["App"]
    Onboarding["Onboarding"]
    Dashboard["Dashboard"]
    Settings["Settings"]
    Billing["Billing"]
  end

  subgraph API["API"]
    Ingest["Ingest API"]
    Overview["Overview API"]
    Intelligence["Intelligence API"]
    StripeWh["Stripe webhook"]
    Cron["Cron jobs"]
    MCPApi["MCP API"]
  end

  subgraph Storage["Storage & services"]
    DB[(PostgreSQL)]
    Stripe["Stripe"]
    Slack["Slack"]
  end

  User --> Public
  User --> App
  SDK --> Ingest
  MCP --> MCPApi
  App --> API
  Ingest --> DB
  Overview --> DB
  Intelligence --> DB
  Billing --> Stripe
  StripeWh --> DB
  StripeWh --> Stripe
  Cron --> DB
  Cron --> Stripe
  API --> Alerts["Alerts/Digest"]
  Alerts --> Slack
```

---

## 2. Route / application structure

**What it shows:** Major route groups (public, app, dashboard, settings).  
**Why it matters:** Codebase navigation and URL structure.

```mermaid
flowchart TB
  subgraph Public["Public routes"]
    P1["/"]
    P2["/pricing"]
    P3["/docs"]
    P4["/login"]
  end

  subgraph Protected["Protected (app)"]
    O["/onboarding"]
    D["/dashboard"]
    Inv["/invite/accept"]
  end

  subgraph Dashboard["Dashboard"]
    W["/dashboard/[workspaceId]"]
    P["/dashboard/.../[projectId]"]
    Set["/dashboard/.../settings"]
    Bill["/dashboard/.../billing"]
  end

  subgraph Settings["Settings"]
    WS["Workspace"]
    PS["Project"]
    AS["Account"]
  end

  P4 --> O
  O --> D
  D --> W
  W --> P
  W --> Set
  W --> Bill
  Set --> WS
  Set --> PS
  D --> AS
```

---

## 3. Authentication flow

**What it shows:** How a user signs in, gets a session, and is routed to onboarding vs dashboard.  
**Why it matters:** Explains protected routes and first-run behavior.

```mermaid
sequenceDiagram
  participant U as User
  participant P as Public page
  participant NextAuth as NextAuth
  participant MW as Middleware
  participant Onb as Onboarding
  participant Dash as Dashboard

  U->>P: Visit /login or /signup
  U->>NextAuth: Sign in (Google / GitHub / Email)
  NextAuth-->>U: Session + JWT
  U->>MW: Request protected route
  MW->>MW: Validate JWT
  alt Path was /login and session exists
    MW-->>U: Redirect to /onboarding
    U->>Onb: Load onboarding
  else Already has workspace + project
    Onb-->>U: Redirect to /dashboard/[workspaceId]
  else No workspace
    Onb-->>U: Show create workspace → project → key
  end
  U->>Dash: Dashboard (auth cached per request)
```

---

## 4. Onboarding flow

**What it shows:** Steps from sign-in to first dashboard view and activation.  
**Why it matters:** Core activation and where the ingest key is shown once.

```mermaid
flowchart TD
  A[Sign in] --> B{Has workspace & project?}
  B -->|Yes| C[Redirect to dashboard]
  B -->|No| D[Create workspace]
  D --> E[Create project]
  E --> F[Backend creates default API key]
  F --> G[Return project + full ingest key once]
  G --> H[User copies key]
  H --> I[Go to dashboard]
  I --> J[Optional: Send test events]
  J --> K[Dashboard shows events, key never shown again]
```

---

## 5. Event ingestion flow

**What it shows:** Three entry points (SDK, test events, MCP), single write path, and how source (sdk vs demo) affects usage and cost.  
**Why it matters:** Core data path; demo exclusion is critical for billing.

```mermaid
flowchart TB
  subgraph Sources["Entry points"]
    SDK["SDK"]
    Test["Test events (UI)"]
    MCP["MCP"]
  end

  subgraph Path["Ingest path"]
    V["Verify key"]
    R["Rate limit"]
    L["Plan limits"]
    N["Normalize"]
    W["Write"]
  end

  subgraph DB["Storage"]
    Events[(ApiCallEvent)]
  end

  subgraph Use["Usage"]
    U["Usage / overage: no demo"]
    C["Cost: no demo"]
    T["Counts / charts: all events"]
  end

  SDK --> V
  Test --> V
  MCP --> V
  V --> R
  R --> L
  L --> N
  N --> W
  W --> Events
  Events --> U
  Events --> C
  Events --> T

  SDK -.->|source: sdk| N
  Test -.->|source: demo| N
  MCP -.->|source: demo| N
```

---

## 6. Dashboard data flow

**What it shows:** Overview API (fast first paint) vs Intelligence API (lazy); which UI sections use which API.  
**Why it matters:** Performance and plan gating (dependency map, custom range).

```mermaid
flowchart TB
  subgraph UI["Dashboard UI"]
    KPI["KPI row"]
    Charts["Charts"]
    Tables["Provider / Operations"]
    Stream["Event stream"]
    Insights["Insights / Guardrails"]
    Map["Dependency map"]
  end

  subgraph APIs["APIs"]
    O["Overview API"]
    I["Intelligence API"]
    E["Events API"]
  end

  subgraph Backend["Backend"]
    A["analytics.ts"]
    U["usage.ts"]
    D[(DB)]
  end

  O --> KPI
  O --> Charts
  O --> Tables
  O --> U
  I --> Insights
  I --> Map
  E --> Stream

  O --> A
  O --> U
  I --> A
  A --> D
  U --> D
```

---

## 7. Alerts flow

**What it shows:** Alert rules, evaluation, cooldown, Slack delivery, and how the scheduler triggers evaluations.  
**Why it matters:** Clarifies what is real (Slack only, no email) and how scheduling works.

```mermaid
flowchart TB
  subgraph Config["Configuration"]
    AR[AlertRule]
    SW[SlackWebhookConfig]
    SC[ProjectScheduleConfig]
  end

  subgraph Trigger["Trigger"]
    Manual["POST /alerts/evaluate"]
    Cron["POST /api/cron/scheduler"]
  end

  subgraph Eval["Evaluation"]
    Stats[getProjectStats]
    Compare[Compare to thresholds]
    Cooldown[Check cooldown per rule]
    Send[Send to Slack]
    AE[Record AlertEvent]
  end

  AR --> Eval
  SW --> Send
  Manual --> Eval
  Cron --> Eval
  Stats --> Compare
  Compare --> Cooldown
  Cooldown --> Send
  Send --> AE
  SC --> Cron
```

---

## 8. Digest flow

**What it shows:** Digest preview (in-app), digest delivery (to Slack), and native scheduling via cron.  
**Why it matters:** Shows built-in scheduling and that delivery is Slack-only.

```mermaid
flowchart LR
  subgraph Content["Content"]
    Gen[generateDigestContent]
    Preview[GET digest/preview]
    Deliver[POST digest/deliver]
  end

  subgraph Schedule["Scheduling"]
    Config[ProjectScheduleConfig]
    Cron[POST /api/cron/scheduler]
    Lock[SchedulerLock]
  end

  subgraph Out["Output"]
    UI[In-app preview]
    Slack[Slack webhooks]
  end

  Gen --> Preview
  Gen --> Deliver
  Preview --> UI
  Deliver --> Slack
  Config --> Cron
  Cron --> Lock
  Cron --> Deliver
```

---

## 9. Billing / Stripe flow

**What it shows:** Billing page → Checkout → Stripe → webhook → Subscription in DB; overage cron adds invoice items.  
**Why it matters:** Monetization and plan sync (planId, period).

```mermaid
flowchart TB
  subgraph User["User"]
    Billing["Billing page"]
    Checkout["Stripe Checkout"]
  end

  subgraph Backend["Backend"]
    Create["Checkout API"]
    Webhook["Stripe webhook"]
    Sub["Subscription"]
    Overage["Overage cron"]
  end

  subgraph Stripe["Stripe"]
    Session["Session"]
    SubS["Subscription"]
    Inv["Invoice + items"]
  end

  Billing --> Create
  Create --> Session
  Billing --> Checkout
  Checkout --> SubS
  Stripe --> Webhook
  Webhook --> Sub
  Overage --> Sub
  Overage --> Inv
  Sub --> Billing
```

---

## 10. Plan enforcement and usage limits

**What it shows:** Where plan limits are defined and enforced (ingest, alerts, dashboard, usage, overage).  
**Why it matters:** Single place to see “who enforces what.”

```mermaid
flowchart TB
  subgraph Truth["Source of truth"]
    PC["pricing-capabilities"]
    ST["stripe / pricing-constants"]
  end

  subgraph Ingest["Ingest"]
    Prov["Max providers"]
    Free["Free 10k + sampling"]
  end

  subgraph API["API"]
    Cap["getCapabilitiesForProject"]
    Rules["Alert / Slack limits"]
  end

  subgraph UI["Dashboard"]
    Gate["Map, range, presets"]
  end

  subgraph Billing["Billing"]
    Bill["Billable usage"]
    NoDemo["Exclude demo"]
  end

  PC --> Cap
  ST --> Prov
  ST --> Free
  ST --> Bill
  Cap --> Rules
  Cap --> Gate
  Bill --> NoDemo
```

---

## 11. Settings architecture

**What it shows:** Split between workspace, project, and account settings with examples.  
**Why it matters:** Where to add new settings and how they are scoped.

```mermaid
flowchart TB
  subgraph Workspace["Workspace settings"]
    W1[General]
    W2[Members]
    W3[Invites]
    W4[Notifications]
    W5[Billing]
    W6[Activity / Danger]
  end

  subgraph Project["Project settings"]
    P1[General]
    P2[API keys]
    P3[Alerts + Slack + digest]
    P4[Dependency controls]
    P5[Data retention]
    P6[Usage / MCP / Danger]
  end

  subgraph Account["Account settings"]
    A1[Profile]
    A2[Preferences]
    A3[Security / MFA / Sessions]
  end

  Workspace --> Project
  Account
```

---

## 12. Permission model

**What it shows:** Roles and which actions they can perform; backend enforcement.  
**Why it matters:** Security and where to add permission checks.

```mermaid
flowchart LR
  subgraph Roles["Roles"]
    Owner[owner]
    Admin[admin]
    Dev[developer]
    View[viewer]
  end

  subgraph Actions["Sensitive actions"]
    Billing[Billing / upgrade]
    Danger[Delete workspace/project]
    Edit[Edit project]
    ViewOnly[View only]
  end

  Owner --> Billing
  Owner --> Danger
  Owner --> Edit
  Admin --> Billing
  Admin --> Danger
  Admin --> Edit
  Dev --> Edit
  View --> ViewOnly

  Backend["ensureWorkspaceAdmin / ensureCanEditProject"] --> Actions
```

---

## 13. MCP / AI assistant integration

**What it shows:** MCP endpoint, public vs authenticated tools, and how tokens scope access.  
**Why it matters:** Explains how Cursor/Claude (or other clients) interact with DependWatch.

```mermaid
flowchart TB
  subgraph Client["MCP client"]
    Cursor["Cursor / Claude / etc."]
  end

  subgraph API["/api/mcp"]
    Auth[Token or none]
    Public[Public tools]
    Private[Auth tools]
  end

  subgraph PublicTools["Public tools"]
    T1[search_docs]
    T2[get_quickstart]
    T3[get_sdk_install]
    T4[get_provider_example]
  end

  subgraph AuthTools["Auth tools"]
    T5[list_workspaces]
    T6[list_projects]
    T7[get_project_setup_status]
    T8[send_test_event]
    T9[get_project_overview]
  end

  Cursor --> API
  API --> Auth
  Auth --> Public
  Auth --> Private
  Public --> PublicTools
  Private --> AuthTools
  AuthTools --> McpToken[McpAccessToken]
```

---

## 14. Core entity relationships

**What it shows:** Key entities and relationships (conceptual).  
**Why it matters:** Data model at a glance.

```mermaid
erDiagram
  User ||--o{ WorkspaceMember : ""
  User ||--o| UserPreference : ""
  User ||--o{ McpAccessToken : ""

  Workspace ||--o{ WorkspaceMember : ""
  Workspace ||--o{ Project : ""
  Workspace ||--o| Subscription : ""
  Workspace ||--o{ BillingOverageRecord : ""

  Project ||--o{ ProjectApiKey : ""
  Project ||--o{ ApiCallEvent : ""
  Project ||--o{ AlertRule : ""
  Project ||--o{ SlackWebhookConfig : ""
  Project ||--o| ProjectScheduleConfig : ""
  Project ||--o{ ApiIncident : ""

  Subscription ||--o{ BillingOverageRecord : ""

  AlertRule ||--o{ AlertEvent : ""
  WorkspaceMember }o--|| Workspace : ""
  WorkspaceMember }o--|| User : ""
```

---

## 15. Demo vs real event semantics

**What it shows:** source = sdk vs demo: what counts in totals vs usage/cost/billing.  
**Why it matters:** Trust and correct billing (demo never billed).

```mermaid
flowchart LR
  subgraph Event["Event source"]
    SDK["sdk"]
    Demo["demo"]
  end

  subgraph In["Counts & charts"]
    C["totalCalls, errors, latency, charts"]
  end

  subgraph Out["Usage & cost"]
    U["eventsThisMonth, overage"]
    Co["costUsd, projected cost"]
    B["Billable usage"]
  end

  SDK --> C
  SDK --> U
  SDK --> Co
  SDK --> B
  Demo --> C
  Demo -.->|excluded| U
  Demo -.->|excluded| Co
  Demo -.->|excluded| B
```

---

## Diagram index

| # | Diagram | Best for |
|---|---------|----------|
| 1 | High-level system architecture | Investors, executive overview |
| 2 | Route / application structure | Codebase navigation |
| 3 | Authentication flow | Security and onboarding |
| 4 | Onboarding flow | Activation and key handling |
| 5 | Event ingestion flow | Engineering, billing correctness |
| 6 | Dashboard data flow | Frontend and API design |
| 7 | Alerts flow | Alerting and Slack integration |
| 8 | Digest flow | Digest and scheduling |
| 9 | Billing / Stripe flow | Monetization and ops |
| 10 | Plan enforcement | Limits and gating |
| 11 | Settings architecture | Where to add settings |
| 12 | Permission model | Security and roles |
| 13 | MCP integration | AI assistant integration |
| 14 | Core entity relationships | Data model |
| 15 | Demo vs real semantics | Trust and billing |

---

## Summary

**File:** `docs/DEPENDWATCH_ARCHITECTURE_DIAGRAMS.md`

**Diagrams included:**  
1. High-level system architecture  
2. Route / application structure  
3. Authentication flow  
4. Onboarding flow  
5. Event ingestion flow  
6. Dashboard data flow  
7. Alerts flow  
8. Digest flow  
9. Billing / Stripe flow  
10. Plan enforcement and usage limits  
11. Settings architecture  
12. Permission model  
13. MCP / AI assistant integration  
14. Core entity relationships  
15. Demo vs real event semantics  

**Best starting point for Excalidraw:**

| Audience | Start with these diagrams |
|----------|----------------------------|
| **Team onboarding** | 1. High-level system architecture, 4. Onboarding flow |
| **Investor / product** | 1. High-level system architecture, 9. Billing / Stripe flow |
| **Engineering handoff** | 5. Event ingestion flow, 6. Dashboard data flow, 15. Demo vs real semantics |

**Second pass applied:** Diagrams were simplified for readability and Excalidraw: shorter box labels, clearer subgraph names, consistent flow direction (TB/LR), and terminology aligned with DEPENDWATCH_SOURCE_OF_TRUTH.md. Each diagram is focused so it can be recreated as one clear visual.
