# Waitlist Registration Lifecycle

End-to-end waitlist flow: persistence, confirmation email, on-site success UX, duplicates, analytics, and admin readiness.

---

## 1. How it works end to end

1. **Visitor submits email** on the landing waitlist form (hero or any instance of `WaitlistForm`).
2. **Client** sends `POST /api/waitlist` with `email`, `source` (e.g. `hero`, `pricing`), and optional `metadata` (UTM params, referrer — captured from URL when available).
3. **API** rate-limits by IP (1 request per 60s), validates email, then calls **waitlist service**.
4. **Service** normalizes email, checks for existing entry:
   - **Duplicate:** Returns `{ ok: true, alreadyRegistered: true }`. No new row, no email sent.
   - **New:** Creates `WaitlistEntry` with `status: 'pending'`, optional fields, and `metadata`; sends **confirmation email** via Resend or SMTP; returns `{ ok: true, emailSent: true/false }`.
5. **Client** shows success or duplicate state, fires analytics, and optionally shows “Check your inbox” when `emailSent` is true.
6. **User** receives a thank-you/confirmation email (premium, technical, concise).

---

## 2. Data model (WaitlistEntry)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | cuid | Primary key |
| `email` | string (unique) | Normalized (trim, lowercase) |
| `source` | string | Signup context: `landing`, `hero`, `pricing`, `footer`, etc. |
| `status` | string | `pending` \| `confirmed` \| `invited` — for future invite waves |
| `name` | string? | Optional |
| `company` | string? | Optional |
| `useCase` | string? | Optional |
| `referralSource` | string? | e.g. hn, reddit, twitter |
| `metadata` | Json? | UTM params, referrer, campaign — for traction analysis |
| `createdAt` / `updatedAt` | DateTime | Audit |

Duplicate behavior: one row per email (unique constraint). Resubmitting the same email is idempotent: success response, no second email.

---

## 3. Thank-you / confirmation email

- **Subject:** “You're on the DependWatch early access list”
- **Content:** Thank you, confirmation of registration, one-sentence product reminder (observability for APIs and AI agent toolchains), note that early users hear first and may get priority onboarding, sign-off from the team. Plain-text fallback included.
- **Template:** `apps/web/src/lib/waitlist-confirmation-email.ts` — `getWaitlistConfirmationContent()`, `sendWaitlistConfirmationEmail()`.
- **Delivery:** Uses existing project pattern: SMTP (e.g. SendGrid) if configured, else Resend (`AUTH_RESEND_KEY`). `EMAIL_FROM` for sender. In dev with no provider, logs and returns ok.

---

## 4. Email delivery configuration

- **Resend:** Set `AUTH_RESEND_KEY` and optionally `EMAIL_FROM` (e.g. `DependWatch <noreply@yourdomain.com>`).
- **SMTP (e.g. SendGrid):** Set `SENDGRID_API_KEY` or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. See `apps/web/src/lib/email-smtp.ts`.
- **From address:** `EMAIL_FROM` env var; default fallback in code.
- No confirmation email is sent for duplicate signups (no resend).

---

## 5. On-site success experience

- **New signup:** “You're on the list.” Subcopy: “Thanks — we've sent a confirmation to your inbox…” or “We've received your request…” depending on `emailSent`. “Check your inbox for the confirmation.” + “Continue exploring →” link to `/#features`.
- **Duplicate:** “You're already on the list.” + “We've already got you — keep an eye on your inbox.” + “Continue exploring →”.
- Layout: icon, heading, short copy, optional inbox line, link. Responsive, no jarring transitions.

---

## 6. Duplicate handling

- Backend: single row per email; duplicate request returns `200` with `alreadyRegistered: true`. No second record, no second email.
- Frontend: duplicate state with friendly copy (see above). No error tone.

---

## 7. Analytics and events

| Event | When |
|-------|------|
| `waitlist_form_view` | Form mounted (once per view) |
| `waitlist_submit_attempt` | User submits form |
| `waitlist_submit_success` | New registration accepted (props: `source`, `emailSent`) |
| `waitlist_submit_failure` | API error or network error |
| `waitlist_submit_duplicate` | Email already registered |
| `confirmation_email_sent` | New signup and email sent |
| `confirmation_email_failed` | New signup but email delivery failed |

All via PostHog (client). Server logs `[waitlist] confirmation_email_failed` when send fails.

---

## 8. Optional metadata (UTM / referrer)

The form sends optional `metadata` when the page has UTM params or referrer:

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `campaign`, `referrer`
- Stored in `WaitlistEntry.metadata` for later analysis (e.g. Reddit vs HN vs Twitter).

API accepts `metadata` in the request body; service sanitizes and persists.

---

## 9. Admin / export readiness

- **Data:** All signups in `WaitlistEntry`. Query by `createdAt`, `source`, `status` for invite waves or reporting.
- **Export:** Use Prisma or SQL: `SELECT * FROM "WaitlistEntry" ORDER BY "createdAt" DESC` (or export to CSV via script/Admin API later).
- **Columns:** `email`, `source`, `status`, `createdAt`, `metadata` (and optional `name`, `company`, etc.) support filtering by campaign/source and sorting by date.
- No admin UI added; data is in one table and easy to query or export.

---

## 10. Troubleshooting: “Backend not called” / “No row in DB”

**No extra env var is required for the waitlist to be “called”.** The form uses a relative URL: `POST /api/waitlist` on the same origin as the page.

1. **Confirm the request is sent**
   - Open DevTools → Network. Submit the form. You should see a `POST` to `/api/waitlist`.
   - If there is **no** request: you may be on a different domain (e.g. preview URL) than the deployed app, or an extension is blocking it. Use the real app URL (e.g. `https://dependwatch.app`).
   - If the request exists: note the **status code** (200 = success, 500 = server/DB error).

2. **Required for saving to DB**
   - **`DATABASE_URL`** must be set in the deployment (e.g. Railway) and must point to the **same** PostgreSQL database where you ran the schema.
   - The **WaitlistEntry** table must exist. On a greenfield DB, run the full schema (e.g. `apps/web/prisma/migrations.sql`) or `npx prisma migrate deploy` so the table is created.

3. **If you see 500 or “Something went wrong”**
   - Backend is being called; the failure is in the API or DB. Check **Railway logs** for the service at the time of the request (e.g. `[waitlist]` or Prisma/connection errors).
   - Verify `DATABASE_URL` is correct and the DB has the `WaitlistEntry` table.

4. **Env vars that are not needed for “backend called”**
   - `INGEST_BASE_URL` is for the **ingest API** (SDK events), not the waitlist. The waitlist form does not use it.
   - `NEXT_PUBLIC_LANDING_MODE` only controls copy/CTAs; it does not affect whether `/api/waitlist` is invoked.

---

## 11. Files added or updated

| Path | Purpose |
|------|---------|
| `apps/web/prisma/schema.prisma` | WaitlistEntry: status, updatedAt, name, company, useCase, referralSource, metadata |
| `apps/web/prisma/migrations/20250312100000_waitlist_lifecycle/migration.sql` | Add new columns and index |
| `apps/web/src/lib/waitlist-confirmation-email.ts` | **New** — subject, HTML/text content, sendWaitlistConfirmationEmail (Resend/SMTP) |
| `apps/web/src/lib/waitlist-service.ts` | **New** — registerWaitlist(): validate, normalize, create, send email; idempotent |
| `apps/web/src/app/api/waitlist/route.ts` | Uses service; accepts metadata; returns emailSent |
| `apps/web/src/components/landing/waitlist-form.tsx` | Success/duplicate UX, UTM metadata, analytics (form_view, attempt, email_sent/failed) |
| `apps/web/src/lib/posthog.ts` | waitlist_form_view, waitlist_submit_attempt, confirmation_email_sent, confirmation_email_failed |
| `docs/WAITLIST_LIFECYCLE.md` | This doc |

---

## 12. Recommended follow-ups

- **Invite waves:** Use `status` (e.g. move to `invited` when you send access) and filter by `createdAt` or segment.
- **Referral / sharing:** Optional “Share with a teammate” or referral link with `?ref=...` in metadata.
- **Founder outreach:** Export by `source` or `metadata.utm_source` to prioritize HN/Reddit signups.
- **Segmentation:** Use `metadata`, `company`, or `useCase` for targeted messaging or invite order.
- **Admin export:** Small script or internal API to export CSV/JSON for mail merge or CRM import.
