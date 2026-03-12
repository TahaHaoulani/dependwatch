# DependWatch — In-App Navigation Performance Bottleneck Report

**Date:** 2025-03-07  
**Scope:** Diagnose causes of slow in-app navigation. No optimizations applied; diagnosis only.

---

## Implementation status (all recommended fixes applied)

| # | Fix (from §8) | Status | Evidence |
|---|----------------|--------|----------|
| 1 | **Add loading.tsx** for dashboard and settings | **Done** | `(app)/loading.tsx`, `(app)/dashboard/loading.tsx`, `(app)/dashboard/[workspaceId]/loading.tsx`, `(app)/dashboard/[workspaceId]/[projectId]/loading.tsx`, `(app)/dashboard/.../settings/loading.tsx` (both workspace and project settings). |
| 2 | **Project layout: single parallel batch** | **Done** | `(app)/dashboard/[workspaceId]/[projectId]/layout.tsx` uses `Promise.all([ getWorkspaceById, getProjectById, getWorkspacesForUser, getProjectsForWorkspace ])` — one round-trip. |
| 3 | **Stats API: stop redundant analytics** | **Done** | `app/api/projects/[projectId]/stats/route.ts` computes `byProvider` and `byOperation` once in the first `Promise.all`, then passes `precomputed: { byProvider, byOperation }` into `getInsights`, `getProjectInsights`, `getProjectGuardrails`, `getProjectDependencyMap`. |
| 4 | **SessionProvider: refetchOnWindowFocus false** | **Done** | `components/providers/session-provider.tsx` sets `refetchOnWindowFocus={false}`. |
| 5 | **Eliminate N+1 in getProjectStatsByProvider / getProjectStatsByOperation** | **Done** | `lib/analytics.ts`: both use a single `$queryRaw` with `GROUP BY provider` (resp. `GROUP BY provider, endpoint`) for percentiles — no per-group loop. |
| 6 | **Avoid full-event scans in getProjectTimeseries and getErrorSpikes** | **Done** | `getProjectTimeseries` and `getErrorSpikes` use DB aggregation (`date_trunc` + `GROUP BY` in raw SQL); no `findMany` of all events. |
| 7 | **Deduplicate auth and layout data** | **Done** | `lib/auth-server.ts`: `auth = cache(getServerSession)`. `lib/workspace.ts` and `lib/project.ts`: `getWorkspaceById`, `getWorkspacesForUser`, `getProjectById`, `getProjectsForWorkspace` use React `cache()` plus Redis/in-memory TTL. |
| 8–10 | **Architectural** (single layout load, stream stats, dynamic recharts) | **Partial** | Recharts is lazy-loaded in dashboard (dynamic import). Single layout load and stream/split stats are optional future improvements. |

---

## 1. EXECUTIVE SUMMARY

| # | Cause | Severity | Explanation |
|---|--------|----------|-------------|
| 1 | **Stats API: redundant analytics + N+1 + full-event scans** | **Critical** | One dashboard load triggers 11+ parallel analytics functions; several call `getProjectStatsByProvider` / `getProjectStatsByOperation` multiple times (4× and 3×). Those two use **N+1** raw SQL (one query per provider, per operation). `getProjectTimeseries` and `getErrorSpikes` load **all events in the time window** into memory with no limit. |
| 2 | **Repeated auth + workspace/project resolution on every route** | **High** | `auth()` and workspace/project lookups run in **every layout and every page**. Navigating to e.g. project settings runs: workspace layout (auth + getWorkspaceById), project layout (auth + getWorkspaceById + getProjectById + getWorkspacesForUser + getProjectsForWorkspace), settings layout (auth + same 4 again), and page (auth + getProjectById). No request-level deduplication for these. |
| 3 | **Project layout: sequential DB round-trip after parallel** | **High** | Project layout does `Promise.all([workspace, project, workspaces])` then **awaits** `getProjectsForWorkspace` in a second step. That adds a full round-trip of latency before the layout can render. |
| 4 | **No loading boundaries** | **High** | There are **no `loading.tsx`** files. Users see nothing until the full RSC tree (all layouts + page) and client hydration complete. Perceived slowness is worse than actual server time. |
| 5 | **Heavy dashboard client bundle + multiple client fetches** | **Medium** | Dashboard page is a large client component that eagerly imports **recharts** and fires **3–5 useQuery** calls (stats, events, usage, event detail, operation detail). Stats response is slow (see #1), so time-to-interactive is gated by that API. |

---

## 2. NAVIGATION PATH ANALYSIS

### 2.1 Dashboard → Project settings (e.g. General)

**Route:** `/dashboard/[workspaceId]/[projectId]` → `/dashboard/[workspaceId]/[projectId]/settings/general`

**What runs:**

1. **Middleware**  
   - `getToken()` (JWT/session check) for the new URL.

2. **Layouts (in order)**  
   - **`[workspaceId]/layout.tsx`**  
     - `auth()`  
     - `getWorkspaceById(workspaceId)`  
     - Redirect if no session or no workspace.  
   - **`[workspaceId]/[projectId]/layout.tsx`**  
     - `auth()`  
     - `Promise.all([ getWorkspaceById, getProjectById, getWorkspacesForUser ])`  
     - Then **sequential** `getProjectsForWorkspace(workspaceId)`  
     - Renders: DashboardNav (workspaces, projects), DashboardHeader, children.  
   - **`[projectId]/settings/layout.tsx`**  
     - `auth()`  
     - `Promise.all([ getWorkspaceById, getProjectById, getWorkspacesForUser, getProjectsForWorkspace ])`  
     - Renders: SettingsShell (nav + breadcrumbs), children.

3. **Page**  
   - **`settings/general/page.tsx`**  
     - `auth()`  
     - `Promise.all([ getProjectById, getWorkspaceMemberRole ])`  
     - Renders ProjectGeneralClient.

**Slowness:**  
- **Auth:** 4× `auth()` (three layouts + one page). Next.js does not dedupe `getServerSession` like `fetch`; each call can hit the session store.  
- **Workspace:** getWorkspaceById runs in workspace layout, project layout, and settings layout (3×).  
- **Project:** getProjectById in project layout, settings layout, and general page (3×).  
- **Workspaces list:** getWorkspacesForUser in project layout and settings layout (2×).  
- **Projects list:** getProjectsForWorkspace in project layout (sequential after Promise.all), again in settings layout (2×).  
- **No loading UI:** User waits for all of the above before any content appears.

### 2.2 Dashboard (project home) → Dashboard view

**Route:** `/dashboard/[workspaceId]/[projectId]`

**What runs:**

1. **Layouts**  
   - Same as above: workspace layout (auth + getWorkspaceById), project layout (auth + 4 data loads, with getProjectsForWorkspace sequential).

2. **Page**  
   - **`[projectId]/page.tsx`**  
     - `auth()`  
     - `getProjectById(projectId)`  
     - Renders `<DashboardView projectId range project={...} />`.

3. **Client**  
   - **DashboardView** (client component):  
     - useQuery `['project-stats', projectId, range]` → **GET /api/projects/[projectId]/stats** (heavy; see §4).  
     - useQuery `['project-events', projectId]` (enabled when hasData).  
     - useQuery `['project-usage', projectId]` (enabled when hasData).  
     - Optional: event detail and operation detail when user selects a row.

**Slowness:**  
- Server: duplicate auth + getProjectById (layout already has project).  
- Client: stats API is the main blocker; it runs 11+ analytics functions with redundant and N+1 queries and full-event scans.  
- No loading.tsx: blank until RSC + client stats load.

### 2.3 Dashboard → Workspace settings / Billing

**Route:** `/dashboard/[workspaceId]` → `/dashboard/[workspaceId]/settings/...` or `/dashboard/[workspaceId]/billing`

**What runs:**

- **Workspace layout:** auth + getWorkspaceById.  
- **Settings layout** (for `/settings/*`): auth + getWorkspaceById + getWorkspacesForUser + getProjectsForWorkspace (again).  
- **Billing page:** auth + getWorkspaceById + getProjectsForWorkspace; builds its own minimal header (no DashboardNav).

**Slowness:**  
- getWorkspaceById and auth repeated in layout(s) and page.  
- No shared loading state.

### 2.4 Workspace switch / Project switch

**Route:** User changes workspace or project via DashboardNav (client) and navigates to new `/dashboard/[workspaceId]` or `/dashboard/[workspaceId]/[projectId]`.

**What runs:**  
- Full layout tree for the new segment: workspace (and project) layout(s) run again.  
- All auth and workspace/project/workspaces/projects fetches run again for the new IDs.  
- No cache of “last workspace/project” on the server; every navigation is a full refetch.

---

## 3. FRONTEND BOTTLENECKS

### 3.1 Layout-level client components

- **DashboardNav** (client): Used in project layout and workspace settings layout. Receives workspaces + projects as props; no extra fetch, but layout must wait for server data before rendering it.  
- **DashboardHeader** (client): Used in project layout, workspace settings layout, account layout, billing page. Depends on session/layout data.  
- **SettingsShell** (client): Uses `usePathname()` for active state; lightweight.

### 3.2 Heavy dashboard client component

- **`dashboard-view.tsx`** (~1,600+ lines, `'use client'`):  
  - Imports **recharts** (LineChart, BarChart, etc.) eagerly — increases dashboard route bundle.  
  - Multiple **useQuery** hooks (stats, events, usage, event detail, operation detail).  
  - No code-splitting for charts; recharts is in the same chunk as the dashboard.  
  - **SyntaxCodeBlock** and other UI are in the same component; any state update can re-render a large tree.

### 3.3 Root providers (every page)

- **ThemeProvider** (client): Context + localStorage; minimal.  
- **SessionProvider** (next-auth): `refetchInterval: 5*60`, `refetchOnWindowFocus: true` — can trigger session refetch on tab focus.  
- **PostHogProvider** (client): Renders PostHogPageView, PostHogIdentify, PostHogPageEvents; each uses `usePathname()` / `useSession()` and effects. Extra work on every navigation.  
- **QueryProvider** (client): `staleTime: 60_000` (1 min). Good; not a major source of refetch storms.

### 3.4 Missing loading UX

- **No `loading.tsx`** in any segment (dashboard, workspace, project, settings).  
- Users see blank or previous route until the full RSC payload and client hydration (and on dashboard, until stats API returns).  
- This makes both server and client latency feel worse than they are.

### 3.5 Link prefetching

- Standard `<Link>` is used; Next.js prefetches by default. No evidence of prefetch disabled. Prefetch helps when the bottleneck is server/layout work (which it is).

---

## 4. BACKEND / SERVER BOTTLENECKS

### 4.1 Stats API: `/api/projects/[projectId]/stats`

**Handler:** `apps/web/src/app/api/projects/[projectId]/stats/route.ts`

**Per request:**

1. `auth()`  
2. `getProjectById(projectId)`  
3. `prisma.subscription.findUnique` (workspace plan)  
4. **Promise.all of 11 analytics calls:**

   - `getProjectStats`  
   - `getProjectStatsByProvider`  
   - `getProjectStatsByOperation`  
   - `getProjectTimeseries`  
   - `getRecentFailures`  
   - `getProjectProjectedMonthlyCost`  
   - `getErrorSpikes`  
   - `getInsights`  
   - `getProjectInsights`  
   - `getProjectGuardrails`  
   - `getProjectDependencyMap` (or null)

**Redundancy:**

- **getProjectStatsByProvider** is used by: stats route directly, **getInsights**, **getProjectInsights**, **getProjectGuardrails**, **getProjectDependencyMap** → effectively **5×** the same data (or 4× if dependencyMap is skipped).  
- **getProjectStatsByOperation** is used by: stats route, **getProjectInsights**, **getProjectGuardrails** → **3×**.  
- **getProjectStats** is used by the route and by **getProjectProjectedMonthlyCost** → **2×**.

So the stats route does far more DB work than necessary.

**N+1 in analytics:**

- **getProjectStatsByProvider** (`lib/analytics.ts`): After `groupBy` by provider, it runs a **raw percentile query per provider** in a loop. N providers → N extra queries.  
- **getProjectStatsByOperation**: Same pattern per (provider, endpoint) group → M extra queries.

**Full-event scans:**

- **getProjectTimeseries**: `prisma.apiCallEvent.findMany({ where: { projectId, timestamp } })` with **no take/limit** — loads all events in the window into memory, then buckets in JS.  
- **getErrorSpikes**: Same pattern — all events in window, then in-memory bucketing.

For 7d or 30d with high volume, these are expensive and memory-heavy.

### 4.2 Layout data fetches

- **getWorkspaceById**: Includes `subscription` and `_count.projects`. Used in multiple layouts and pages.  
- **getProjectById**: Includes `workspace` and `apiKeys`. Used in project layout, settings layout, dashboard page, and settings pages.  
- **getProjectsForWorkspace**: Calls `ensureWorkspaceAccess` (extra DB check) then `findMany`.  
- **getWorkspacesForUser**: `findMany` with `_count.projects`.  

No `unstable_cache` or `cache()` is used; every navigation hits the DB.

### 4.3 Prisma / DB

- **ApiCallEvent** has useful indexes: `(projectId, timestamp)`, `(projectId, provider, timestamp)`, etc.  
- Bottlenecks are **redundant calls**, **N+1** in analytics, and **full-event** reads, not missing indexes per se.

---

## 5. AUTH / SESSION IMPACT

- **Middleware:** Every protected request runs `getToken({ req, secret, cookieName })`. One session read at the edge.  
- **Layouts and pages:** Each segment that calls `auth()` runs `getServerSession(authOptions)`. There is **no application-level deduplication** of `auth()` within the same request. So for a single navigation you can get:
  - 1× getToken (middleware)  
  - 3–4× getServerSession (layouts + page)  
- **SessionProvider:** `refetchOnWindowFocus: true` can cause extra `/api/auth/session` calls when the user returns to the tab.  
- **Contribution to slowness:** Session lookups add latency on every segment; repeated in every layout and page. Not the single biggest cost, but multiplicative with the number of segments.

---

## 6. CACHE / DATA FLOW ISSUES

- **Server:** No use of Next.js `cache()` or `unstable_cache()` for auth, workspace, or project. Same data is refetched on every layout and page.  
- **Client:** React Query `staleTime: 60_000` (1 min) reduces refetches when navigating back to the same project/dashboard within a minute. Stats/events/usage are still refetched when mounting DashboardView on a fresh navigation (new RSC).  
- **Navigation:** Moving from dashboard → settings → dashboard causes full layout + page refetch; no “soft” cache of workspace/project on the server.  
- **Stats API:** No HTTP cache headers or server-side cache; every dashboard load hits the heavy stats handler.  
- **Invalidation:** After “Send test events”, dashboard invalidates project-stats, project-events, project-usage and refetches; appropriate but underscores that stats are always loaded from scratch on load.

---

## 7. BUNDLE / HYDRATION ISSUES

- **recharts:** Imported only in `dashboard-view.tsx`. It is loaded with the dashboard route (and any parent layout client code). Not used on settings or billing; could be dynamically imported for the chart sections to reduce initial dashboard JS.  
- **lucide-react:** Many icons in dashboard-view; tree-shaking should limit to used icons.  
- **SyntaxCodeBlock:** Used in dashboard; likely pulls in a highlighter. Could be lazy-loaded.  
- **Root layout:** No client boundary at root; all four providers (Theme, Session, PostHog, Query) are client and wrap the entire app. Hydration runs for all of them on first load; on navigation, only the new segment’s client components re-render.  
- **PostHog:** Loaded and initialized when key/host exist; pageview and identify run in effects. Adds some work on each navigation but not the main bottleneck.

---

## 8. TOP RECOMMENDED FIXES (by ROI)

### Quick wins

1. **Add `loading.tsx`** for dashboard and settings segments (e.g. `app/dashboard/[workspaceId]/loading.tsx`, `app/dashboard/[workspaceId]/[projectId]/loading.tsx`, `app/dashboard/.../settings/loading.tsx`). Immediate improvement in perceived speed.  
2. **Project layout: single parallel batch** — Include `getProjectsForWorkspace` in the same `Promise.all` as workspace, project, and getWorkspacesForUser so the layout does one round-trip, not two.  
3. **Stats API: stop redundant analytics** — Compute `getProjectStatsByProvider` and `getProjectStatsByOperation` once in the handler; pass results into getInsights, getProjectInsights, getProjectGuardrails, getProjectDependencyMap (or refactor so those accept precomputed data). Removes 3–4× duplicate work.  
4. **SessionProvider:** Set `refetchOnWindowFocus: false` (or reduce refetch frequency) if session freshness every tab focus is not required.

### High impact (backend)

5. **Eliminate N+1 in getProjectStatsByProvider / getProjectStatsByOperation** — Replace per-group raw percentile queries with a single aggregated query (e.g. window functions or batch percentile computation) so provider and operation stats are computed in one or two queries, not N and M.  
6. **Avoid full-event scans in getProjectTimeseries and getErrorSpikes** — Use DB aggregation (group by bucket, count/sum) or capped reads instead of loading all events into memory.  
7. **Deduplicate auth and layout data** — Use React `cache()` (or Next.js `cache()`) around `auth()`, and around getWorkspaceById / getProjectById / getWorkspacesForUser / getProjectsForWorkspace with a key (e.g. userId, workspaceId, projectId) so the same request reuses the same result across layouts and page.

### Architectural

8. **Single layout data load** — Consider loading workspace + project + workspaces + projects once in the topmost dashboard layout and passing via context or props so nested layouts and pages do not refetch.  
9. **Dashboard: stream or split stats** — Return fast critical stats first (e.g. totalCalls, byProvider summary) and load timeseries/insights/guardrails in a second request or stream.  
10. **Dynamic import recharts** — Lazy-load chart components in DashboardView so the initial dashboard bundle is smaller and hydration faster.

---

## 9. FILES INVOLVED

| Area | Files |
|------|--------|
| **Layouts (auth + data)** | `app/dashboard/[workspaceId]/layout.tsx`, `app/dashboard/[workspaceId]/[projectId]/layout.tsx`, `app/dashboard/[workspaceId]/settings/layout.tsx`, `app/dashboard/[workspaceId]/[projectId]/settings/layout.tsx`, `app/settings/account/layout.tsx` |
| **Pages (duplicate auth/data)** | `app/dashboard/[workspaceId]/[projectId]/page.tsx`, `app/dashboard/[workspaceId]/page.tsx`, `app/dashboard/[workspaceId]/billing/page.tsx`, `app/dashboard/[workspaceId]/[projectId]/settings/general/page.tsx`, and other settings pages |
| **Auth** | `lib/auth-server.ts`, `lib/auth.ts`, `middleware.ts` |
| **Workspace / project** | `lib/workspace.ts`, `lib/project.ts` |
| **Stats API** | `app/api/projects/[projectId]/stats/route.ts` |
| **Analytics (N+1, full scans)** | `lib/analytics.ts` (getProjectStatsByProvider, getProjectStatsByOperation, getProjectTimeseries, getErrorSpikes, getInsights, getProjectInsights, getProjectGuardrails, getProjectDependencyMap) |
| **Dashboard client** | `components/dashboard/dashboard-view.tsx` (recharts, useQuery, large component) |
| **Providers** | `components/providers/session-provider.tsx`, `components/providers/posthog-provider.tsx`, `components/providers/query-provider.tsx`, `app/layout.tsx` |
| **Loading (missing)** | No `app/dashboard/**/loading.tsx` or `app/settings/**/loading.tsx` |

---

## 10. CLASSIFICATION OF PERCEIVED SLOWNESS

| Pain point | Primary cause |
|------------|----------------|
| **Dashboard feels slow** | Stats API: redundant analytics, N+1, full-event scans (server/DB) + no loading UI (poor loading UX) + large client component with recharts (hydration/JS). |
| **Settings navigation feels slow** | Repeated auth + workspace/project/workspaces/projects in each layout and page (server/DB) + no loading.tsx (poor loading UX). |
| **Project/workspace switch feels slow** | Full layout re-run and refetch of all layout data (server/DB + network). |
| **First load after login** | Same as above plus root providers and full RSC tree; no loading boundaries. |
| **Tab focus / return to tab** | SessionProvider refetchOnWindowFocus and possible PostHog/identify work (network + JS). |

---

**Conclusion:** The largest gains will come from (1) reducing stats API work (dedupe, fix N+1, avoid full-event scans), (2) adding loading boundaries, (3) deduplicating auth and layout data within a request, and (4) making the project layout a single parallel fetch. Implementing the quick wins and high-impact backend changes above will directly address where time is going and why navigation feels slow.
