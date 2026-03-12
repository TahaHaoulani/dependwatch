# Launch Blocker Review — Final

**Date:** March 2025  
**Scope:** Second-pass brutal audit after hardening (Stripe webhook, pricing/digest/overage alignment). Focus: fake premium, pricing/backend mismatch, subscription state, alert/digest usability, first-paying-customer embarrassment.

---

## Fixes applied in this pass

1. **Billing page** — Removed “Email alerts: Yes/No”. Current plan now shows **Alert rules** and **Slack webhooks** from `getPlanCapabilities(planId)` (1 / 10 / unlimited and 0 / 3 / unlimited). No misleading email claim.
2. **Terms** — Overage wording updated: “If overage billing is enabled in the future, we will notify you… Today, Pro/Scale overage is billed at period end; Free hard cap.”
3. **Stripe webhook** — On `customer.subscription.updated`, **planId is derived from price id** when `STRIPE_PRICE_BUILDER` / `STRIPE_PRICE_STARTUP` match; otherwise metadata/existing. Ensures plan stays correct after plan change in Stripe Customer Portal.
4. **lib/stripe.ts** — `emailAlerts: false` for all plans; `slackAlerts: true` for builder and startup (false for free). Aligns getPlanLimits() with Slack-only reality.
5. **Docs page** — Alerts sections and Limits section updated: Free = 1 rule, no Slack; Pro = 10 rules, 3 webhooks; Scale = unlimited. All “email alerts” / “email + Slack” claims removed.
6. **MCP docs content** — Alerts summary updated to Slack-only and correct plan limits.
7. **Account notifications page** — Copy updated so it doesn’t imply email alert delivery; points to Preferences and clarifies “Alert delivery is via Slack”.
8. **Privacy** — “incident alerts” in email use list changed to “security and product notifications”.
9. **Acceptable use** — “Email and Slack” changed to “Slack and other alert channels”; “email addresses” removed from destinations list.
10. **DEPENDWATCH_SOURCE_OF_TRUTH.md** — §9 documents Stripe webhook behavior (planId from price on update, free on delete); §19 updated for implemented items.

**Launch-hardening pass (trust, coherence, operational readiness):**

- **Wording:** Alerts settings page and docs budget-alert copy: Slack-only, no email. Digest card: “Preview” vs “Delivery” clearly labeled; preview not sent until deliver endpoint is called.
- **Empty states:** Alert rules: “No rules yet” + “add webhooks below to receive in Slack.” Slack webhooks: “No webhooks yet” when list empty. Billing: success/cancel use prominent bordered boxes with clear next step.
- **Feedback:** Billing success = “Plan updated” + what’s now available; cancel = “No charges; upgrade anytime below.” Run evaluation toasts: when no Slack (Free), say “Add webhooks (Pro) to receive in Slack”; when triggered, “sent to your enabled Slack webhooks.”
- **Settings clarity:** Slack webhooks show **Active** / **Paused** per URL with Activate/Pause toggle. Digest section: “Preview” (in-app, not sent) vs “Delivery” (cron → enabled webhooks). Free plan note under alert rules: “alerts not sent to Slack; upgrade to Pro for webhooks.”
- **SoT:** §13 UX principles updated with “Settings clarity” and empty-state expectations.

---

## 1. Final go / no-go for production launch

**Go**, with the understanding below.

- **Subscription state:** Single source of truth: Stripe webhook. Checkout sets plan; subscription.updated derives plan from price id (or metadata); subscription.deleted sets plan to free and clears Stripe IDs. Billing page and all capability checks read from `Subscription.planId`.
- **Pricing vs backend:** Pricing page, landing, docs, billing page, and capabilities table match: Free (1 rule, 0 webhooks), Pro (10, 3), Scale (unlimited). Overage is “Free hard cap; Pro/Scale billed at period end” everywhere (pricing, FAQ, terms).
- **Alerts:** Rule creation and webhook creation are enforced by `getCapabilitiesForProject`. Evaluate sends to Slack only; no fake “email delivery.” Docs and UI say Slack-only.
- **Digest:** Preview for all; deliver is Pro/Scale only, sends to project Slack webhooks. No in-app scheduler; documented “call POST digest/deliver from cron.” No claim that digests are “automatically scheduled” by the product.
- **No fake premium:** Dependency map, custom range, digest delivery, and Slack limits are gated in API and UI; billing page does not list email alerts.

**Condition:** Ensure `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_BUILDER` / `STRIPE_PRICE_STARTUP` are set in production and the Stripe webhook endpoint is registered for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

---

## 2. Top 5 remaining risks — FIXED

| # | Risk | Status |
|---|------|--------|
| 1 | **Digest/alert scheduling is external** | **Fixed.** Native scheduling: ProjectScheduleConfig (digest + alert frequency), POST /api/cron/scheduler (CRON_SECRET), SchedulerLock for multi-instance safety. Settings → Alerts: “Automated schedule” card. No external cron required. |
| 2 | **Subscription row consistency** | **Fixed.** getWorkspaceSubscription(workspaceId) fetches or auto-creates (planId free). All plan reads refactored to use it. getWorkspaceById attaches subscription when missing. |
| 3 | **Stripe price IDs in env** | **Fixed.** lib/config.ts validates STRIPE_* at first Stripe use; resolvePlanFromPriceId(priceId) mapping; webhook uses it and logs warning for unknown priceId. |
| 4 | **Navigation/layout performance** | **Mitigated.** auth/getWorkspaceById/getProjectById/getProjectsForWorkspace/getWorkspacesForUser use React cache(). loading.tsx boundaries exist for dashboard and settings. |
| 5 | **Overage / Free plan limit** | **Fixed.** Free: 10k hard limit with progressive sampling at ingest. Pro/Scale: overage allowed and billed via Stripe invoice items at period end ($5/100k, $3/100k). Pricing/terms match. See OVERAGE_BILLING_RUNBOOK.md. |

---

## 3. What is safe to hand over to GTM as a truthful product

GTM can safely say:

- **Plans:** Free ($0), Pro ($29/mo), Scale ($99/mo). Limits (providers, retention, alert rules, Slack webhooks) as on the pricing page and in the docs.
- **Alerts:** Slack only. Free: 1 alert rule, no Slack webhooks. Pro/Scale: set **Automated schedule** (e.g. every 1/5/15 min) in Settings → Alerts; no external cron needed.
- **Digest:** Preview in-app for all plans. Pro/Scale: use **Automated schedule** (Settings → Alerts) to send digest daily/weekly to Slack; no external cron needed.
- **Billing:** Stripe Checkout; plan and period stay in sync via webhooks. Cancel returns workspace to Free; Pro/Scale overage is billed at period end ($5/100k, $3/100k); Free has hard event cap.
- **Feature gating:** Dependency map, custom date range, operations table, digest delivery, and Slack webhooks are enforced by plan; no “fake” premium features shown as available without entitlement.
- **Do not claim:** Email alert delivery. (Scheduled digest/alert runs are now built-in.)

---

*This file is the outcome of the second-pass launch blocker review. For ongoing product and implementation truth, use `DEPENDWATCH_SOURCE_OF_TRUTH.md`.*
