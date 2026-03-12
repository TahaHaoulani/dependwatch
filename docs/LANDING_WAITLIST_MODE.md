# Landing Page Waitlist Mode

Feature-flagged “Early Access / Waitlist” mode for the DependWatch landing page. Use it to test traction (e.g. Reddit, HN) while the product is still in development, without replacing the full landing page.

## How to toggle modes

Set the env var (client-safe, so `NEXT_PUBLIC_`):

- **Product mode (default):** `NEXT_PUBLIC_LANDING_MODE=product` or leave unset.  
  Full CTAs: Sign Up, Login, “Start monitoring your APIs”, “Start free”, etc. Hero shows primary + secondary buttons.

- **Waitlist mode:** `NEXT_PUBLIC_LANDING_MODE=waitlist`  
  Launch-oriented CTAs: “Join Early Access”, “Request Access”. Hero shows email capture form + “See how it works”. All primary CTAs point to `/#waitlist` or the hero form.

Revert to product mode by setting `NEXT_PUBLIC_LANDING_MODE=product` or removing the var.

## What was changed

1. **Config & copy**
   - `apps/web/src/lib/landing-mode.ts`: `getLandingMode()`, `isWaitlistMode()`, `getLandingCopy()`.  
   - Single source of CTA labels and hrefs per mode. Page and header read from here.

2. **Waitlist backend**
   - **Prisma:** `WaitlistEntry` model (`email` unique, `source`, `createdAt`).  
   - **API:** `POST /api/waitlist` — validates email, rate limit (1 per IP per 60s), idempotent for duplicates (returns success + `alreadyRegistered: true`).  
   - **DB:** Run migration for the new table (or `npx prisma db push` in dev):
     ```bash
     npx prisma migrate dev --name add_waitlist_entry --schema=apps/web/prisma/schema.prisma
     ```
     If your migration history has issues, use `prisma db push` for a quick dev DB sync.

3. **Email capture UI**
   - `apps/web/src/components/landing/waitlist-form.tsx`: Email input, submit, loading/success/error/duplicate states, validation, analytics events.  
   - Used in hero when in waitlist mode (compact variant). Section id `waitlist` for `/#waitlist` anchor.

4. **Header**
   - `MarketingHeader` uses `getLandingCopy()` and `isWaitlistMode()` so Login/Sign Up labels and hrefs switch automatically (no new props).

5. **Landing page**
   - `apps/web/src/app/page.tsx`: All hero, quick start, pricing, final CTA, and MCP copy/CTAs come from `getLandingCopy()`.  
   - In waitlist mode: hero shows `WaitlistForm` + “See how it works”; pricing/final CTAs use “Join Early Access” and `/#waitlist` or `/#waitlist`; pricing subcopy and optional incentive line (“Early users get priority onboarding”) shown.

6. **Analytics**
   - New PostHog events: `hero_cta_clicked`, `section_cta_clicked`, `waitlist_submit_success`, `waitlist_submit_failure`, `waitlist_submit_duplicate`.  
   - Fired from `WaitlistForm` and from TrackedLink on the page.

## Files touched / added

| Path | Purpose |
|------|--------|
| `apps/web/src/lib/landing-mode.ts` | Mode enum, getLandingMode, isWaitlistMode, getLandingCopy (product vs waitlist copy) |
| `apps/web/src/lib/posthog.ts` | New event names for waitlist and hero/section CTAs |
| `apps/web/prisma/schema.prisma` | `WaitlistEntry` model |
| `apps/web/src/app/api/waitlist/route.ts` | POST handler: validate, rate limit, dedupe, store |
| `apps/web/src/components/landing/waitlist-form.tsx` | Email form component (states, validation, analytics) |
| `apps/web/src/components/marketing/marketing-header.tsx` | Uses getLandingCopy + isWaitlistMode for CTAs/hrefs |
| `apps/web/src/app/page.tsx` | Uses getLandingCopy; hero shows form or buttons by mode; pricing/final CTAs from copy |
| `.env.example` | Commented `NEXT_PUBLIC_LANDING_MODE` |
| `docs/LANDING_WAITLIST_MODE.md` | This doc |

## Follow-up recommendations

- **Conversion:** Track `waitlist_submit_success` and `section_cta_clicked` in PostHog; A/B test headline or CTA copy if you add a second variant.  
- **Email:** Wire waitlist emails to your CRM or mailing tool (e.g. export `WaitlistEntry` or send to Resend/Segment) when ready.  
- **Founding plan:** When you launch, filter or tag early entries (e.g. by `createdAt` or `source`) for “founding user” offers.  
- **Pricing page:** If you have a dedicated `/pricing` page, consider the same mode there (e.g. gate signup with waitlist when in waitlist mode).
