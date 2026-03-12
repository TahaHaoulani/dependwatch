# Landing Page Performance — Diagnosis & Fixes

## 1. Diagnosis Summary

### Exact causes of slow landing-page display

- **Root layout wrapped every route in SessionProvider and QueryProvider**  
  Visiting `/` caused the entire app tree (including the landing page) to mount `SessionProvider` (next-auth). As soon as that client boundary hydrated, NextAuth called `getSession()` → **`/api/auth/session`**. That fetch blocked or delayed first meaningful paint and caused repeated session activity in network/console.

- **MarketingHeader used `useSession()`**  
  The landing header was a client component that called `useSession()` to show "Dashboard" vs "Login/Sign Up". That pulled session into the critical path for `/` and further encouraged session fetches and re-renders.

- **PostHogIdentify ran at root and used `useSession()`**  
  `PostHogIdentify` lived inside the root `PostHogProvider` and called `useSession()` to identify users. So on every page (including `/`) the provider tree triggered session usage and thus `/api/auth/session` even when no app UI needed it.

- **Heavy app shell on public routes**  
  Public marketing pages (/, /pricing, /docs, etc.) were paying the same client cost as the dashboard: SessionProvider, QueryProvider, and session-dependent PostHog identify. No split between “public marketing shell” and “authenticated app shell.”

### What did *not* cause slowness

- **Middleware**  
  Middleware runs for `/` and uses `getToken()` for redirect logic. That is server-side JWT read from the cookie and does **not** call `/api/auth/session`. It was not the source of repeated session API calls.

- **Server-side auth**  
  `auth()` / `getServerSession()` in server components and API routes do not trigger client-side `/api/auth/session`; only the client-side `SessionProvider` and `useSession()` do.

---

## 2. Fixes Implemented

### Architecture

- **Route group `(app)`**  
  Authenticated/app routes now live under `app/(app)/`: login, onboarding, dashboard, settings, invite, incidents. URL paths are unchanged (e.g. `/dashboard/...`).

- **Root layout is minimal**  
  Root layout now only includes: `ThemeProvider`, `PostHogProvider` (pageview + page events only), `Toaster`. It no longer includes `SessionProvider` or `QueryProvider`.

- **App layout**  
  `app/(app)/layout.tsx` wraps only app routes with `SessionProvider`, `QueryProvider`, and `PostHogIdentify`. Public routes never mount this layout, so they never mount session or react-query.

### Auth / session

- **No session on public routes**  
  `/`, `/pricing`, `/docs`, and other public pages no longer mount `SessionProvider` or any component that calls `useSession()`, so they do **not** trigger `/api/auth/session`.

- **MarketingHeader no longer uses session**  
  The public header is static: it always shows Dashboard (link to `/onboarding`), Login, and Sign Up. It does not call `useSession()`, so it does not pull session into the landing page.

### Providers

- **PostHog**  
  - Root: `PostHogProvider` still provides PostHog and renders `PostHogPageView` and `PostHogPageEvents` (pageview + funnel events).  
  - `PostHogIdentify` was removed from the root provider and is now rendered only inside `(app)/layout.tsx`, so identify runs only when the user is in the app shell (where `SessionProvider` exists).

### Static / cache-friendly behavior

- **Landing page**  
  The `/` page remains a server component with no `cookies()`/`headers()`/dynamic APIs, so it is static by default and cache-friendly. No change was needed to force static; the main gain is removing client-side session and heavy providers from the shell.

### Hydration / client JS

- **Smaller client boundary on `/`**  
  The landing page no longer hydrates SessionProvider, QueryProvider, or PostHogIdentify. Only ThemeProvider, PostHog (pageview/events), and the page’s own client components (e.g. header, animations) run. This reduces JS and hydration work on the first viewport.

---

## 3. Files Changed

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Removed `SessionProvider` and `QueryProvider` from root; added comment explaining public vs app shell. |
| `apps/web/src/app/(app)/layout.tsx` | **New.** Client layout that wraps app routes with `SessionProvider`, `QueryProvider`, and `PostHogIdentify`. |
| `apps/web/src/components/providers/posthog-provider.tsx` | Removed `PostHogIdentify` from the default tree; exported `PostHogIdentify` for use in `(app)` layout only. |
| `apps/web/src/components/marketing/marketing-header.tsx` | Removed `useSession()`; header is static with Dashboard, Login, Sign Up for all users. |
| `apps/web/src/app/page.tsx` | Added comment that landing is static and does not use session. |
| **Moved into `app/(app)/`** | `login/`, `onboarding/`, `dashboard/`, `settings/`, `invite/`, `incidents/` (pathnames unchanged). |

---

## 4. Before vs After Behavior

### Before

- Opening `/` loaded the root layout with ThemeProvider → **SessionProvider** → PostHogProvider (with **PostHogIdentify**) → **QueryProvider** → page.
- As soon as the client hydrated, SessionProvider and PostHogIdentify (and MarketingHeader’s `useSession()`) triggered **`/api/auth/session`**.
- The landing page felt slow and the network tab showed repeated session requests during load.

### After

- Opening `/` loads the root layout with ThemeProvider → PostHogProvider (pageview + page events only) → page. **No SessionProvider, no QueryProvider, no PostHogIdentify.**
- MarketingHeader renders the same nav without calling `useSession()`, so **no `/api/auth/session`** on the landing page.
- App routes (`/login`, `/dashboard`, …) load `(app)/layout` and get SessionProvider, QueryProvider, and PostHogIdentify; session and identify run only there.

---

## 5. Remaining Landing-Page Bottlenecks

- **PostHog script and pageview/events**  
  Still loaded on `/`. They are async and do not block first paint; acceptable for analytics. If needed later, PostHog could be loaded after interaction or only on certain routes.

- **Client components on the landing page**  
  MarketingHeader, HeroDashboardPreview, AnimateInView, etc. remain client components. Further gains would require converting or lazy-loading below-the-fold sections; current changes already remove the main cost (session/auth).

- **Middleware `getToken()` on `/`**  
  One server-side JWT read per request. Low cost and not on the critical path for the browser; no change made.

---

## 6. How to Verify

- **No session call on `/`**  
  Open `http://localhost:3000`, open DevTools → Network, filter by “session”. There should be no `/api/auth/session` request when loading the landing page.

- **Session still works on app routes**  
  Go to `/login`, sign in, then open `/dashboard`; session and PostHog identify should work as before. Dashboard and other app routes still use `(app)/layout` with SessionProvider and QueryProvider.

- **First paint**  
  The landing page should paint quickly; the main delay from session/auth on `/` should be gone.
