# Overage Billing — Runbook & Production Readiness

**Last updated:** March 2025.

This document covers operational notes, remaining risks, and production readiness for overage billing.

---

## 1. Architecture Summary

- **Model:** Invoice-item based. One Stripe invoice item per workspace per billing period for overage amount.
- **Source of truth:** `lib/billing-usage.ts` — workspace billable events in `[periodStart, periodEnd)` (end exclusive), `source != 'demo'`.
- **Idempotency:** One `BillingOverageRecord` per `(workspaceId, periodStart)`. Record is created before Stripe call; P2002 (race) is caught and returns existing; recovery path under lock creates missing Stripe item when record exists but `stripeInvoiceItemId` is null.
- **Cron:** `POST /api/cron/overage-billing` (CRON_SECRET). Processes subscriptions whose `currentPeriodEnd` is in the next 7 days.

---

## 2. Operational Runbook

### Deploy

1. **Migrations:** Ensure `BillingOverageRecord` migration is applied (`prisma migrate deploy` or equivalent).
2. **Env:** No new env vars. Existing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BUILDER`, `STRIPE_PRICE_STARTUP`, `CRON_SECRET`.

### Cron

- **Endpoint:** `POST /api/cron/overage-billing`
- **Auth:** `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
- **Schedule:** Daily (e.g. once per day). Optional: every 6–12h for faster recovery if Stripe had failed.
- **Example (Vercel):** In `vercel.json` cron, add a job that calls this URL with CRON_SECRET in headers.

### After a Stripe or DB failure

- **Record created but no Stripe item:** Next cron run will find the record with `amountCents > 0` and `stripeInvoiceItemId = null`, acquire lock `overage:{workspaceId}:{periodStart}`, create the invoice item, update the record. No manual step required.
- **Duplicate run / race:** Second request gets P2002 on create, refetches existing record, returns. No double invoice item.

### Reconciliation

- **DB:** `BillingOverageRecord` rows with `stripeInvoiceItemId` set can be matched to Stripe invoice line items (description or amount).
- **Stripe:** Filter invoice items by description containing "Overage" and match to `BillingOverageRecord` by customer/period if needed.

---

## 3. Remaining Risks

| Risk | Mitigation | Severity |
|------|------------|----------|
| **Clock skew** | Period boundaries use server time; Stripe uses UTC. Subscription period is stored from webhook (Stripe’s epoch). Events counted with `timestamp >= periodStart` and `timestamp < periodEnd`. Minor skew only affects events at the exact boundary. | Low |
| **New event source in future** | If a new `source` value is added (e.g. internal), ensure it is either excluded from billable usage in `getWorkspaceBillableEventsForPeriod` or explicitly included. Today only `demo` is excluded. | Low |
| **Plan change at period end** | Overage amount is fixed when we create `BillingOverageRecord` (we store `amountCents` and `overageEvents`). So the plan used is the subscription’s plan at the moment we run and create the record. If you run cron before renewal, you use the plan that was active during the period. If you run after renewal (e.g. period ended yesterday), you might see the new plan — then we’d compute overage with the new plan’s rate. To avoid that, run overage cron daily with a 7-day window so you typically process 1–7 days before period end, i.e. subscription not yet renewed. | Low if cron runs daily. |
| **Stripe invoice item limit / throttling** | One item per workspace per period. Unlikely to hit limits. On 429, current code returns error; next cron retry will hit recovery path (record exists, no stripeInvoiceItemId). | Low |

**Mid-period plan change (detail):** When we run `runOverageBillingForEligibleSubscriptions`, we query subscriptions with `currentPeriodEnd` in the next 7 days. So we run before or around period end. When we call `ensureOverageBillingForPeriod` we pass `sub.planId` — at that moment the subscription might already have been renewed (planId could be the new plan). To be strict, we could add `planIdDuringPeriod` to `BillingOverageRecord` and set it when we create the record (from the subscription’s planId at create time). Then when creating the Stripe item in the recovery path we’d use that stored planId. For the initial create we already use the subscription’s planId. So the only issue is: customer had Pro, period ends March 31, they downgrade to Free on March 30. On April 1 we run cron; we might not process them (they’re no longer paid). So we’d never create the overage record for March. That’s acceptable — we don’t bill them. If they had Pro, period ends March 31, they upgrade to Scale on March 30, we run April 1: we process with Scale planId, so we use Scale overage rate. That’s a bit generous (they had Pro for most of the period). Acceptable for launch; we can add planIdSnapshot to the record later if we want strict proration.

---

## 4. Production Readiness Verdict

**Overage billing is production-ready** with the following conditions:

- **Double-billing:** Prevented by unique `(workspaceId, periodStart)`, create-before-Stripe, P2002 handling, and recovery under lock so only one process creates the Stripe item for a given record.
- **Demo leakage:** All billable paths use `source: { not: 'demo' }`; test events are stored as `demo`. No leakage.
- **Period alignment:** Billing uses Stripe’s `currentPeriodStart` / `currentPeriodEnd`; event count uses `[periodStart, periodEnd)` (end exclusive). Consistent with Stripe semantics.
- **UI vs Stripe:** Billing page shows “Estimated overage this cycle” from the same `getWorkspaceBillableUsageForPeriod` and `overageCentsForPlan` used for the invoice item. Match is by design.
- **Copy:** Pricing page, landing page, FAQ, and reassurance no longer say “tracked only” or “we will notify before enabling”; they state that Pro/Scale overage is billed at period end and Free has a hard cap.

**Recommended before going live:**

1. Run overage cron daily (or at least before subscription renewal peaks).
2. Monitor logs for `[overage-billing] Stripe invoice item failed`; recovery will retry on next cron run.

---

## 5. Checklist for Launch

- [ ] Migration `20250310200000_billing_overage_record` applied in production.
- [ ] Cron configured for `POST /api/cron/overage-billing` with CRON_SECRET.
- [ ] Stripe webhook includes `invoice.finalized` (logging only; optional).
- [ ] Pricing/FAQ/landing copy reviewed for “tracked only” / “not yet” and updated (done in codebase).
- [ ] One manual test: create a paid workspace, generate overage, run cron (or wait for scheduled run), confirm one BillingOverageRecord and one Stripe invoice item for that period.
