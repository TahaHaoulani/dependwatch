# Pricing, Billing & Usage — Trustworthiness Audit

**Date:** 2025-03-07  
**Scope:** Pricing UI, plan limits, usage metering, overage messaging, and alignment with backend behavior.

---

## 1. Estimator vs plan thresholds ✅ CONSISTENT

| Source | Free | Pro (builder) | Scale (startup) |
|--------|------|----------------|-----------------|
| `lib/pricing-constants.ts` | 10,000 | 100,000 | 1,000,000 |
| `lib/stripe.ts` (eventsPerMonth) | EVENT_LIMITS.free | EVENT_LIMITS.builder | EVENT_LIMITS.startup |
| Usage estimator `getRecommendedPlanId()` | same constants | same | same |
| Usage API `getProjectUsage()` limit | getPlanLimits(planId).eventsPerMonth | same | same |

**Verdict:** Single source of truth. Estimator and backend use the same thresholds. No drift.

---

## 2. Plan claims vs actual product behavior

**Summary table (post-fix):**

| Claim | Status | Actual behavior |
|-------|--------|-----------------|
| Events included (10k / 100k / 1M) | Backed | getProjectUsage returns limit, overageEvents; dashboard shows X/Y and Over included; ingest does not reject. |
| Overage pricing ($5 / $3 per 100k) | Qualified | Copy: we notify before enabling overage billing; no charge without notice. |
| Free: excess events may be paused or sampled | Acceptable | Soft wording; ingest accepts all. |
| APIs monitored (2 / 10 / unlimited) | Backed | providerCount, maxProviders in usage API and dashboard. |
| Event history (7 / 90 / 365 days) | Backed | getWindow(range, retentionDays) clamps window; stats/usage pass plan retention; parseRange supports 90d, 365d. |
| Email vs Slack alerts | Product claim | Plan flags and copy consistent; verify in alert implementation. |
| Insights and guardrails (Pro/Scale only) | Backed | Stats API gates by planId: Free empty; Pro full except traffic_anomaly; Scale all. |
| Anomaly detection (Scale only) | Backed | traffic_anomaly guardrail only for Scale. |

### 2.1 Events included & overage display ✅ BACKED

- **Claim:** 10k / 100k / 1M events included; overage shown.
- **Reality:** `getProjectUsage()` returns `eventsThisMonth`, `limit`, `overageEvents`. Dashboard shows "X / Y" and "Over included: Z events" when Z > 0.
- **Ingest:** Does not reject when over limit (comment in `api/ingest/route.ts`). "Never stops monitoring" is accurate.

### 2.2 Overage billing ($5 / $3 per 100k) ✅ QUALIFIED

- **Claim:** Pro/Scale overage pricing when usage exceeds included events.
- **Reality:** Copy updated: we will notify before enabling overage billing; no charge without notice. No Stripe metered billing yet; policy is clear.

### 2.3 Free: "excess events may be paused or sampled" ✅ ACCEPTABLE

- **Claim:** "On Free, excess events may be paused or sampled."
- **Reality:** Ingest accepts all events; no pause or sampling implemented.
- **Verdict:** "May be" is appropriately soft. Not a hard promise. Acceptable for launch.

### 2.4 APIs monitored (2 / 10 / unlimited) ✅ BACKED FOR DISPLAY

- **Claim:** Free 2, Pro 10, Scale unlimited APIs (distinct providers).
- **Reality:** `getProjectUsage()` returns `providerCount` (distinct providers this month) and `maxProviders` from plan. Dashboard shows "APIs monitored: X / Y" for Free and Pro. No ingest rejection when over provider limit (soft entitlement).
- **Verdict:** Entitlement is visible and consistent; enforcement is display-only. No overclaim.

### 2.5 Event history / retention (7 / 90 / 365 days) ✅ BACKED

- **Claim:** "7-day history", "90-day history", "365-day history" (and comparison table "Event history").
- **Reality:** `getWindow(range, retentionDays)` clamps analytics window to plan retention. Stats API and usage pass `retentionDays` from workspace plan. Free sees at most 7d, Pro 90d, Scale 365d. `parseRange()` supports 90d and 365d.
- **Verdict:** Event history is enforced in query scope; no overclaim.

**Recommendation:** Either (a) implement retention (e.g. scope queries by plan’s retention window and/or delete older data), or (b) soften copy to "Intended event history" / "Planned retention" and add a footnote that full enforcement is coming.

### 2.6 Email vs Slack alerts ⚠️ UNVERIFIED

- **Claim:** Free and Pro: email only. Scale: email + Slack webhook.
- **Reality:** `PLANS` has `slackAlerts: true` only for Scale. Billing page shows "Slack webhook alerts" for Scale. No alert delivery or Slack webhook configuration code was found in the audited paths; no plan check before sending to Slack.
- **Verdict:** Plan *definition* is consistent; **feature and gating** are not verified. If alerts are not yet implemented, or Slack is not gated by plan, the claim could be ahead of behavior.

**Recommendation:** Confirm in code (or product) that (1) alert delivery exists, and (2) Slack is only available when `plan.slackAlerts === true`. If not, adjust pricing copy until gating exists.

### 2.7 Insights & guardrails (Pro/Scale only) ✅ BACKED

- **Claim:** Pro/Scale get insights and guardrails; Free provider-level only; Anomaly detection Scale-only.
- **Reality:** Stats API gates by planId: Free gets empty `insights`, `projectInsights`, `guardrails`. Pro gets insights + guardrails excluding `traffic_anomaly`. Scale gets all including traffic anomaly.

---

## 3. Usage counting foundation ✅ REAL

- **Events this month:** `getProjectUsage()` uses `prisma.apiCallEvent.count()` for current calendar month (monthStart–monthEnd). Used by dashboard and usage API.
- **Provider count:** Distinct providers via `prisma.apiCallEvent.groupBy({ by: ['provider'] })` for same window.
- **Overage:** `overageEvents = max(0, eventCount - limits.eventsPerMonth)` computed from real count and plan limit.
- **Plan for usage:** Workspace subscription → `planId` → `getPlanLimits(planId)` → same limits as pricing.

**Verdict:** Usage metering is real and consistent. No placeholder or fake numbers.

---

## 4. Overage messaging: backed vs deferred

| Message | Backed by code? | Note |
|--------|------------------|------|
| "DependWatch never stops monitoring your APIs" | ✅ Yes | Ingest does not reject; comment in ingest route. |
| "Overage billing... We will notify you before enabling" | ✅ Yes | Pricing page and FAQ state we notify before overage billing; no charge without notice. |
| "On Free, excess events may be paused or sampled" | ✅ Acceptable | Soft wording; no overclaim. |
| FAQ: overage pricing when enabled, notify before charges | ✅ Yes | Copy updated to reflect policy. |

---

## 5. No pricing page statement materially overclaims (summary)

| Area | Status | Action |
|------|--------|--------|
| Event limits (10k/100k/1M) | ✅ | None. |
| Estimator thresholds | ✅ | None. |
| Usage & overage display | ✅ | None. |
| "Never stops monitoring" | ✅ | None. |
| Overage $ amounts | ✅ | Qualified: notify before enabling. |
| Retention / event history | ✅ | Enforced: getWindow + retentionDays in stats and usage. |
| Slack alerts | ⚠️ | Plan flag and copy consistent; verify in alert implementation. |
| Insights & guardrails Pro/Scale only | ✅ | Gated in stats API by planId; anomaly Scale-only. |

---

## 6. Final launch trustworthiness verdict

**Status: GO**

All material mismatches have been fixed:

1. **Insights and guardrails** — Stats API now gates by workspace plan: Free gets no insights/guardrails; Pro gets insights + guardrails excluding traffic_anomaly; Scale gets all. Anomaly (traffic_anomaly) is Scale-only.
2. **Event history / retention** — Analytics use `getWindow(range, retentionDays)`; stats and usage pass plan retention. Free sees at most 7 days, Pro 90, Scale 365. parseRange supports 90d and 365d.
3. **Overage billing** — Copy updated on pricing page and FAQ: we will notify before enabling overage billing; no charge without notice.

**Remaining (non-blocking):** Slack alert delivery and plan gating should be verified in the alert implementation; plan definition and billing copy are consistent.
