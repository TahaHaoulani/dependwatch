# DependWatch Theme System

Production-quality light/dark theme system with system preference support, consistent across dashboard, analytics, insights, onboarding, settings, billing, docs, charts, code blocks, and landing.

---

## 1. Theme system architecture

- **Class-based application**: The active theme is applied via a class on `<html>`:
  - **Dark**: `html.dark` (Tailwind `dark:` variant and CSS vars)
  - **Light**: `html.theme-light` (CSS vars only; no `dark` class)
- **No flicker**: A script runs before hydration via Next.js `Script` with `strategy="beforeInteractive"` (source: `public/theme-init.js`). It reads `localStorage.getItem('dependwatch-theme')` and `prefers-color-scheme`, then sets `html` to either `dark` or `theme-light`.
- **Client sync**: `ThemeProvider` (React context) runs after hydration, syncs with the same storage and media query, and updates the document when the user changes theme or when system preference changes (when theme is "System").
- **Single source of truth**: All UI colors come from CSS variables. Components use Tailwind utilities that reference these variables (e.g. `bg-background`, `text-muted-foreground`, `border-border`, `bg-code-background`). No hardcoded hex/rgb in component classNames for theme-dependent colors.

---

## 2. Token definitions

### Elevation and polish (light mode)

Light theme includes Stripe/Linear-style polish:

- **Shadows**: `--shadow-card`, `--shadow-card-hover`, `--shadow-popover` (soft, layered in light; minimal in dark).
- **Radius**: `--radius-card` (12px light, 8px dark), `--radius-input` (8px light, 6px dark).
- **Card border**: `--card-border` (softer in light). Cards use `data-card` for theme-aware elevation and hover shadow in light.
- **Buttons**: `duration-150` transitions and active states.
- **Inputs**: `rounded-input`, hover/focus border polish in light.
- **Headers**: Light mode header gets a subtle bottom shadow and softer border.
- **Typography**: Slightly tighter letter-spacing for headings in light.

### Shadcn-compatible (HSL, space-separated)

Used by existing UI primitives (Button, Card, Input, etc.):

- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

### Semantic tokens (DependWatch)

- **Backgrounds**: `--background-primary`, `--background-secondary`, `--surface`, `--surface-hover`
- **Borders**: `--border-primary`, `--border-subtle`
- **Text**: `--text-primary`, `--text-secondary`, `--text-muted`
- **Accent**: `--accent-primary`, `--accent-primary-hover`, `--accent-secondary`
- **Semantics**: `--danger`, `--danger-foreground`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground`
- **Surfaces**: `--card-background`, `--table-row-hover`
- **Code**: `--code-background`, `--code-border`
- **Charts**: `--chart-grid`, `--chart-label`, `--chart-1` … `--chart-5`
- **Overlay**: `--overlay` (modals/dialogs)

Dark and light palettes are defined in `apps/web/src/app/globals.css` under `:root`/`.dark` and `.theme-light`. Light theme is tuned for readability and long sessions (near-white primary background, soft borders, deep neutral text, brand accent).

---

## 3. Files and components updated

| Area | Files |
|------|--------|
| **Theme core** | `apps/web/src/lib/theme.ts`, `apps/web/src/app/globals.css`, `apps/web/tailwind.config.ts`, `apps/web/public/theme-init.js` |
| **Provider & toggle** | `apps/web/src/components/providers/theme-provider.tsx`, `apps/web/src/components/ui/theme-toggle.tsx` |
| **Root layout** | `apps/web/src/app/layout.tsx` (ThemeProvider, inline theme script, no forced `dark` class) |
| **Headers** | `apps/web/src/components/dashboard/dashboard-header.tsx` (theme toggle), `apps/web/src/components/marketing/marketing-header.tsx` (theme toggle) |
| **UI primitives** | `apps/web/src/components/ui/dialog.tsx` (overlay uses `bg-overlay`) |
| **Code blocks** | `apps/web/src/components/docs/code-block.tsx` (code-background, code-border), `apps/web/src/components/landing/how-it-works-code.tsx` (code-background, code-border) |
| **Landing** | `apps/web/src/components/landing/hero-dashboard-preview.tsx` (border/surface tokens) |
| **Charts** | `apps/web/src/components/dashboard/dashboard-view.tsx` (chart-container, CartesianGrid stroke from `--chart-grid`), `globals.css` (chart-container styles for grid/label/tooltip) |
| **Error page** | `apps/web/src/app/global-error.tsx` (token-based background/foreground/buttons) |

Existing components that already used `bg-background`, `text-foreground`, `border-border`, `bg-card`, etc. work in both themes without changes. Hardcoded colors (e.g. `bg-zinc-900`, `bg-black/80`, `#0d1117`) were replaced with tokens.

---

## 4. Toggle implementation

- **Location**: Top-right of the header: dashboard (next to Docs/Billing/Account) and marketing/docs (next to nav links, before Login/Sign up).
- **Control**: Icon button (moon in dark, sun in light) opening a dropdown with three options: **Light**, **Dark**, **System**. Current choice is indicated with a checkmark.
- **Storage**: Preference is stored in `localStorage` under `dependwatch-theme` (`'dark'` | `'light'` | `'system'`).
- **Behavior**: On option click, `setTheme` updates storage, context, and calls `applyThemeToDocument(isDark)`, which toggles `dark` / `theme-light` on `document.documentElement`. The UI updates immediately via CSS variable switching (no full re-render of the tree).

---

## 5. Accessibility considerations

- **Contrast**: Light theme uses dark text on light backgrounds and muted text that meets typical readability targets. Danger/success/warning and chart colors were chosen to remain distinguishable in both themes.
- **Focus**: Theme toggle and dropdown use visible focus styles (ring) from the existing Button and DropdownMenu components.
- **Label**: The toggle button has `aria-label="Toggle theme"`. Dropdown options are clearly labeled (Light / Dark / System).
- **Reduced motion**: Existing `prefers-reduced-motion` handling (e.g. API marquee) is unchanged; theme switch only changes CSS variables and does not add motion.
- **No flash**: The inline script prevents a flash of the wrong theme for users who have a stored or system preference.

---

## 6. Screens verified in both modes

Recommended manual QA in both **Dark** and **Light** (and **System** with OS toggled):

- **Dashboard**: KPIs, charts (call volume, latency), usage card, guardrails/alerts, provider table, SDK example, empty state.
- **Pricing**: Plans, usage estimator, CTAs.
- **Billing**: Plan and upgrade actions (dashboard billing page).
- **Docs**: Nav, code blocks, copy button, sections.
- **Onboarding**: Steps, forms, copy key.
- **Quickstart / MCP**: Setup and connect assistant cards.
- **Dependency / analytics**: Any dependency graph or event stream views (if present).
- **Landing**: Hero, features, how-it-works code, footer.
- **Modals / toasts**: Dialog overlay, toast styling.
- **Global error**: Error page with Try again / Go home.

Charts use `--chart-grid` and `--chart-label` so grid and axis labels adapt; tooltips use `--card` and `--border`. Code blocks use `--code-background` (dark in both themes for readability) with theme-aware selection highlight in CSS.

---

## Performance

Theme switching only updates the `html` class and CSS variables. No layout thrashing or full app re-render; React state is minimal (theme + resolvedDark in context). The initial theme is set once in the head script and then kept in sync by the ThemeProvider.
