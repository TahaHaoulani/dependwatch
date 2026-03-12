# DependWatch — Performance Audit (Navigation & Tab Switching)

**Date:** 2025-03-11  
**Scope:** Route/layout/provider tree, rerender and remount sources, heavy pages, React Query, context, tables/charts, bundle/code-splitting. Evidence from codebase; top fixes implemented.

**Related:** [NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md](./NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md) (2025-03-07).

---

## 1. Route / Layout / Provider Tree

```
Root (layout.tsx)
├── ThemeProvider
├── PostHogProvider
│   ├── PostHogPageView, PostHogPageEvents
│   └── children → (app) or public routes
└── Toaster

(app) layout (server)
└── AppLayoutClient(session from server)
    ├── SessionProvider(session)
    ├── QueryProvider (QueryClient from useState — stable)
    │   ├── NavigationProgress (usePathname)
    │   ├── PostHogIdentify (useSession)
    │   └── children → route segment
    └── ...

Dashboard [workspaceId] layout (server, force-dynamic)
└── children (no shared UI; project layout renders header)

Dashboard [workspaceId]/[projectId] layout (server, force-dynamic)
├── auth + getWorkspaceById, getProjectById, getWorkspacesForUser, getProjectsForWorkspace (Promise.all)
├── header: Link, DashboardNav(workspaces, projects, currentWorkspace, currentProject), DashboardHeader(workspaceId, projectId, userEmail)
└── main → children (page or settings layout)

Project settings layout (server)
├── same 4 data fetches (cache() dedupes within request)
└── SettingsShell(navItems, breadcrumbs) → children (settings page)
```

- **Public routes** (/, /pricing, etc.) do not mount SessionProvider/QueryProvider — good.
- **App layout** runs on every (app) route; session is passed from server so no client session fetch on first app load.
- **Project layout** re-runs on every navigation under a project; React `cache()` and Redis dedupe workspace/project/list within the same RSC request.
- **No provider remount on route change** — SessionProvider and QueryProvider are stable; only `children` swaps, so the new page mounts and the old one unmounts (expected).

---

## 2. Top 10 Unnecessary Rerender / Remount Sources

| # | Source | Evidence | Fix |
|---|--------|----------|-----|
| 1 | **useToast() subscription** | Every component that called `useToast()` subscribed to the module-level listener. Any `toast()` call triggered `listeners.forEach(l => l(state))`, so 20+ components (dashboard, settings, billing, nav, etc.) re-rendered on every toast. | **Fixed:** Split into `useToastState()` (used only by Toaster) and `useToast()` returning stable `{ toast, dismiss }` with no subscription. Only Toaster re-renders when toasts change. |
| 2 | **SettingsShell grouped nav** | `grouped = navItems.reduce(...)` ran on every render. pathname changes (tab switch) cause re-render; grouped was recomputed every time. | **Fixed:** `useMemo(() => navItems.reduce(...), [navItems])`. |
| 3 | **Project dashboard route chunk** | Page eagerly imported `DashboardView`, so the entire dashboard-view tree (and all non-dynamic imports) was in the route chunk. Heavy first load for /dashboard/ws/proj. | **Fixed:** `DashboardViewLoader` dynamic-imports `DashboardView` with `DashboardLoadingContent` as loading. Route chunk stays small; dashboard view loads after first paint. |
| 4 | **Project layout props** | DashboardNav and DashboardHeader receive new object/array refs (workspaces, projects, workspace, project) from server on every layout run. No React.memo, so they re-render even when data is logically unchanged. | Recommendation: memo(DashboardNav) / memo(DashboardHeader) with custom compare (e.g. by workspace.id, project.id) or pass stable ids and let client read from store. |
| 5 | **NavigationProgress** | usePathname() causes re-render on every route change. Correct behavior; no fix. | — |
| 6 | **DashboardView** | Multiple useQuery hooks at top level; any query update (overview, intelligence, events, etc.) re-renders the whole ~970-line component and subtree. | Charts/dialogs already lazy; consider splitting into smaller components that subscribe only to the query they need. |
| 7 | **PostHogIdentify / PostHogPageView** | usePathname / useSession in effects. Re-render on pathname/session change. Low frequency. | — |
| 8 | **DashboardHeader** | useTheme(); re-renders when theme changes. Rare. | — |
| 9 | **AppLayoutClient children** | When route changes, `children` prop changes; QueryProvider and everything below re-render. QueryClient is stable so no refetch storm. New page mounts (expected). | — |
| 10 | **Toast effect dependency** | Previous useToast had `useEffect(..., [state])`; state in deps caused re-subscribe on every toast. | Fixed by removing subscription from useToast. |

---

## 3. Pages / Tabs With Likely Heavy Mount Cost

| Route / area | Heavy elements | Notes |
|--------------|----------------|-------|
| **/dashboard/[ws]/[proj]** | DashboardView (many useQueries, KPI row, empty state, provider table, events, guardrails, insights). Charts and dialogs already dynamic. | **Fixed:** DashboardView now loaded via DashboardViewLoader (dynamic); skeleton until chunk loads. |
| **/dashboard/.../settings/*** | SettingsShell + page client (e.g. ProjectAlertsClient, ProjectApiKeysClient). Each tab is a full route; new page mounts each time. | Loading skeleton exists; SettingsShell grouped nav memoized. |
| **/dashboard/[ws]/settings/billing** | BillingClient (Stripe, forms). | Consider dynamic import if bundle is large. |
| **Incidents [incidentId]** | Incident detail page. | Check for heavy tables/charts. |
| **Onboarding** | OnboardingClient. | Single-time flow. |
| **MCP page** | McpSetupClient. | Could be lazy if not on critical path. |

---

## 4. React Query Configuration and Query Key Design

**Configuration (query-provider.tsx):**

- `staleTime: 60_000` (1 min) — good; reduces refetches.
- `refetchOnWindowFocus: false` — **fixed** in earlier pass; no refetch storm on tab focus.

**Query keys (dashboard-view, dashboard-open-incidents):**

- `['project-overview', projectId, range]` — correct; range changes invalidate.
- `['project-intelligence', projectId, range]` — correct.
- `['project-events', projectId]` — correct; no range.
- `['project-event', projectId, selectedEventId]` — correct; enabled when selectedEventId set.
- `['operation-detail', projectId, provider, endpoint, range]` — correct.
- `['project-incidents', projectId]` — correct.

**Design:** Keys are granular (projectId, range, selected ids). No overly broad keys that would cause unnecessary cache invalidation. `placeholderData: keepPreviousData` used for overview to avoid flash when range changes.

---

## 5. Auth / Org / Global Context and Broad Rerenders

| Context / provider | Scope | Rerender risk |
|-------------------|--------|----------------|
| **ThemeProvider** | Root. Value is `useMemo(() => ({ theme, setTheme, resolvedDark }), [theme, setTheme, resolvedDark])`. setTheme is useCallback. | Low; only theme consumers (e.g. DashboardHeader) re-render when theme changes. |
| **SessionProvider** (next-auth) | (app) only. Session from server. refetchOnWindowFocus: false. | Low. |
| **QueryProvider** | (app) only. QueryClient from useState(() => new QueryClient()) — stable. | No broad rerender from provider. |
| **PostHogProvider** | Root. Renders PostHogPageView, PostHogPageEvents. | Pathname/session in effects; not context-driven broad rerender. |
| **Toast (module store)** | useToast() was subscribing every consumer to toast state. | **Fixed:** Only Toaster subscribes via useToastState(); useToast() returns stable { toast, dismiss }. |

No org/workspace React context that would force broad rerenders; layout data is passed as props from server layouts.

---

## 6. Large Table / Chart Components — Eager vs Lazy

| Component | Where used | Eager / lazy |
|-----------|------------|--------------|
| **DashboardCharts** (recharts) | DashboardView | **Lazy:** `dynamic(..., { ssr: false, loading: ChartSectionSkeleton })`. |
| **OperationDetailDialog** (recharts) | DashboardView | **Lazy:** `dynamic(..., { ssr: false })`; mounts when user opens dialog. |
| **DashboardOpenIncidents** | DashboardView | **Lazy:** `dynamic(..., { ssr: false })`. |
| **DashboardProviderTable** | DashboardView | Eager (part of dashboard-view chunk). No recharts; tables are DOM-heavy but not huge. |
| **DashboardView itself** | Project dashboard page | **Fixed:** Now loaded via DashboardViewLoader (dynamic); entire dashboard view (including provider table, KPI row, etc.) is in a separate chunk. |
| **SettingsShell** | All project/workspace settings | Eager; lightweight (nav + breadcrumbs). |

---

## 7. Bundle / Code-Splitting Opportunities

| Opportunity | Status |
|-------------|--------|
| **Project dashboard page** | **Done.** Page uses DashboardViewLoader; dashboard-view and its tree (recharts via LazyDashboardCharts, etc.) load in a separate chunk after first paint. |
| **Recharts** | Only loaded inside dynamic()-wrapped DashboardCharts and OperationDetailDialog; not in main or layout bundle. |
| **Settings pages** | Each tab is a route; Next.js code-splits by route. No single huge settings bundle. |
| **Billing / MCP** | Could dynamic-import BillingClient or McpSetupClient if their bundles are large; not done in this pass. |
| **Root layout** | ThemeProvider, PostHogProvider, Toaster only; no heavy libs. (app) layout does not import dashboard or settings. |

---

## 8. Top 3 Highest-ROI Fixes (Implemented)

1. **Toast: stop broad rerenders**
   - **File:** `components/ui/use-toast.ts`, `components/ui/toaster.tsx`
   - **Change:** Added `useToastState()` used only by Toaster. `useToast()` now returns `useMemo(() => ({ toast, dismiss }), [])` and does not subscribe to toast state. When any code calls `toast()`, only Toaster (which uses `useToastState()`) re-renders; the 20+ other consumers no longer re-render.
   - **Why:** Every toast (success, error, etc.) was causing a cascade of rerenders across dashboard, settings, billing, nav, and all forms. This was a major unnecessary work source.

2. **SettingsShell: memoize grouped nav**
   - **File:** `components/settings/settings-shell.tsx`
   - **Change:** Wrapped `navItems.reduce(...)` in `useMemo(..., [navItems])`. Grouped nav is stable across pathname-driven re-renders.
   - **Why:** SettingsShell re-renders on every pathname change (tab switch). Recomputing grouped on every render was redundant work.

3. **Dashboard route: lazy-load DashboardView**
   - **Files:** `components/dashboard/dashboard-view-loader.tsx` (new), `app/(app)/dashboard/[workspaceId]/[projectId]/page.tsx`
   - **Change:** Page now renders `DashboardViewLoader`, which dynamic-imports `DashboardView` with `loading: () => <DashboardLoadingContent />`. The project dashboard route chunk no longer includes the full dashboard-view tree.
   - **Why:** DashboardView is large (many components, useQueries, and downstream dynamic charts). Eager loading made the route chunk heavy and delayed interactivity. Now the segment loading skeleton shows, then the lighter loader chunk, then the dashboard-view chunk loads and mounts.

---

## 9. Before vs After (This Pass)

| Before | After |
|--------|--------|
| Any toast triggered rerenders in every component that called useToast() (20+). | Only Toaster re-renders when toasts change; useToast() returns stable { toast, dismiss } with no subscription. |
| SettingsShell recomputed grouped nav on every pathname re-render. | Grouped nav is useMemo'd; only recomputes when navItems change. |
| Project dashboard page eagerly imported DashboardView; route chunk included full dashboard tree. | Page uses DashboardViewLoader; DashboardView loads in a separate chunk after first paint; skeleton shown in between. |
| (Previous pass) Workspace layout had unused getProjectsForWorkspace import. | Removed. |
| (Previous pass) React Query refetchOnWindowFocus default true. | refetchOnWindowFocus: false in QueryProvider. |

---

## 10. Summary of What Changed and Why

**1. Toast (use-toast.ts + toaster.tsx)**  
Showing a toast used to notify every subscriber of the module-level store, so every component that called `useToast()` re-rendered. Only the Toaster needs to re-render to display the list. We introduced `useToastState()` for that single subscriber and changed `useToast()` to return a stable `{ toast, dismiss }` with no subscription. Result: toasts no longer cause broad rerenders across the app.

**2. SettingsShell (settings-shell.tsx)**  
The sidebar grouped nav was computed with `navItems.reduce(...)` on every render. Tab switches change pathname and re-render SettingsShell; the grouping only depends on `navItems`, which is stable per layout. We wrapped the reduce in `useMemo(..., [navItems])` so we don’t recompute on every pathname change.

**3. Dashboard route (dashboard-view-loader.tsx + page)**  
The project dashboard page previously imported `DashboardView` directly, so the route chunk contained the whole dashboard (tables, hooks, and references to lazy charts). We added `DashboardViewLoader`, which dynamic-imports `DashboardView` with a loading skeleton. The initial route chunk is smaller; the dashboard view loads after first paint, improving time-to-interactive for the project dashboard route.

These three changes reduce unnecessary rerenders (toast, settings nav) and reduce the cost of mounting the project dashboard (smaller initial chunk, lazy DashboardView). They do not change behavior or features.

---

## 11. Remaining Recommendations

- **Backend/analytics:** See [NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md](./NAVIGATION_PERFORMANCE_BOTTLENECK_REPORT.md). N+1 and full-event scans in overview/intelligence still drive TTFB.
- **Memoize layout header:** Consider React.memo(DashboardNav) and React.memo(DashboardHeader) with a custom comparator on workspace.id, project.id, and list lengths so layout re-runs with cached data don’t force header rerenders when props are logically equal.
- **Instrumentation:** Add lightweight perf marks for route change and key data fetches to validate in production.
- **Billing / MCP:** If bundle analysis shows large client components, dynamic-import them similarly to DashboardViewLoader.
