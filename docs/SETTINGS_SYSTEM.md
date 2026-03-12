# DependWatch Settings System

End-to-end settings architecture: **Workspace** → **Project** → **Account**.

---

## 1. Architecture

### Split

| Scope | Purpose | Who can change |
|-------|--------|----------------|
| **Workspace** | Name, description, members, roles, billing, integrations, security, danger zone | Owners & admins (general: edit; members: manage). Viewers/developers: read-only on general. |
| **Project** | Name, description, environment, API keys, alerts, retention, usage, MCP, danger zone | Owners, admins, developers: full edit. Viewers: read-only. Delete project: owners & admins only. |
| **Account** | Profile, security, preferences, sessions, notifications | Only the signed-in user |

### Routes

**Workspace settings** (under `/dashboard/[workspaceId]/settings/`):

- `general` — name, description
- `members` — list, change role, remove (owner/admin only)
- `billing` — redirects to `/dashboard/[workspaceId]/billing`
- `integrations` — link to workspace notifications; per-project Slack in project settings
- `notifications` — workspace-level Slack webhook URL, test notification button
- `security` — who can manage what
- `activity` — workspace activity log (keys, members, webhooks, destructive actions)
- `danger` — delete workspace (owner only)

**Project settings** (under `/dashboard/[workspaceId]/[projectId]/settings/`):

- `general` — name, description, environment
- `api-keys` — create, revoke, rotate; masked preview, last used, rotated at
- `alerts` — alert rules (latency, error rate, budget) + Slack webhooks
- `data-retention` — retention override (plan default when null)
- `usage` — events this month, providers, limits (real data)
- `dependency-controls` — ApiPolicy config (foundation; runtime TBD)
- `mcp` — link to MCP setup
- `danger` — delete project (owner/admin only)

**Account settings** (under `/settings/account/`):

- `profile` — display name, email (read-only from provider)
- `security` — sign-in & MFA (TOTP enroll, QR, backup codes, disable)
- `preferences` — theme, timezone, alert digest, email/billing notifications
- `sessions` — sign out; sign out all sessions (invalidate all JWTs)
- `notifications` — link to preferences

---

## 2. Backend & data model

### Migrations

- **20250307180000_settings_system**:  
  - `Workspace.description`  
  - `Project.description`, `Project.environment`, `Project.retentionDaysOverride`  
  - `ProjectApiKey.rotatedAt`  
  - `UserPreference` (theme, timezone, dateFormat, defaultLandingPage, emailNotifications, billingNotifications, alertDigest)
- **20250307200000_invites_and_workspace_slack**:  
  - `Workspace.slackWebhookUrl`  
  - `WorkspaceInvite` (email, role, tokenHash, tokenPrefix, expiresAt, acceptedAt)  
  - `AuditLog` index on `(userId, createdAt)`
- **20250307210000_user_session_version**:  
  - `User.sessionVersion` (increment to invalidate all JWTs)
- **20250307220000_user_mfa**:  
  - `User.mfaEnabled`, `totpSecretEncrypted`, `pendingTotpSecretEncrypted`, `backupCodesHashed`

### Permissions (lib/workspace.ts)

- `ensureWorkspaceAccess(workspaceId, userId)` — any member
- `ensureWorkspaceAdmin(workspaceId, userId)` — owner or admin (billing, members, workspace general)
- `ensureWorkspaceOwner(workspaceId, userId)` — owner only (delete workspace)
- `ensureCanEditProject(workspaceId, userId)` — throws if viewer (project edits, keys, alerts, webhooks, retention)
- `getWorkspaceMemberRole(workspaceId, userId)` — returns `owner` | `admin` | `developer` | `viewer`

### APIs

- **Workspace**: `GET/PATCH/DELETE /api/workspaces/[workspaceId]` (PATCH includes `slackWebhookUrl`); `GET /api/workspaces/[workspaceId]/members`; `PATCH/DELETE /api/workspaces/[workspaceId]/members/[memberId]`; `GET/POST /api/workspaces/[workspaceId]/invites`, `DELETE /api/workspaces/[workspaceId]/invites/[inviteId]`; `GET /api/workspaces/[workspaceId]/activity`; `POST /api/workspaces/[workspaceId]/notifications/test`
- **Invite (public)**: `GET /api/invite?token=xxx` (invite details); `POST /api/invite/accept` (body: `{ token }`, auth required)
- **Project**: `PATCH/DELETE /api/projects/[projectId]`; keys, alert-rules, webhooks/slack (CRUD)
- **Account**: `GET/PATCH /api/account/preferences`; `PATCH /api/account/profile`; `GET /api/account/mfa/status`; `POST /api/account/mfa/enroll/start`, `POST /api/account/mfa/enroll/verify`; `POST /api/account/mfa/disable`; `POST /api/account/sessions/revoke-all`

All enforce auth and the above permission rules where applicable.

---

## 3. Features implemented end-to-end

- **Workspace general**: name, description; save with validation.
- **Workspace members**: list, change role (admin/developer/viewer), remove (owner/admin; owner cannot be removed); **invite by email** (role, pending list, revoke, accept flow at `/invite/accept?token=...`).
- **Workspace notifications**: workspace-level Slack webhook URL (save), test notification button.
- **Workspace activity**: activity log for keys, members, webhooks, alert rules, workspace/project delete (last 50); UI under Settings → Activity.
- **Workspace billing**: redirect to existing billing page.
- **Workspace danger**: delete workspace with name confirmation; owner only.
- **Project general**: name, description, environment; save.
- **Project API keys**: create (label), masked prefix, last used, rotated at; revoke; rotate (create new + revoke old).
- **Project alerts**: CRUD alert rules (latency, error rate, budget, cooldown); enable/disable.
- **Project Slack webhooks**: add/remove project-level Slack webhook URLs (alerts page).
- **Project data retention**: optional override (1–365 days); plan default when null.
- **Project usage**: real usage (events, providers, limits) from existing usage API.
- **Project danger**: delete project with name confirmation; owner/admin only.
- **Account profile**: display name (PATCH); email from provider.
- **Account preferences**: theme, timezone, alert digest, email/billing toggles; persisted in `UserPreference`.
- **Account security (MFA)**: TOTP enrollment (QR, 6-digit verify), backup codes (one-time, shown once), disable (with code or backup code). TOTP secret stored encrypted when `MFA_ENCRYPTION_KEY` is set. **MFA at login**: not yet enforced; enrollment and disable are real; login flow will require TOTP in a future update.
- **Account sessions**: sign out (this device); sign out all sessions (increments `User.sessionVersion`, invalidating all JWTs; then client signs out).

---

## 4. Security

- **Keys**: Ingest keys hashed (SHA-256); full key returned only in create/rotate response bodies, never in GET or logs. Ingest API does not log the key; only hash is stored.
- **MFA**: TOTP (speakeasy), QR enrollment, backup codes (hashed, one-time use), disable with code; optional encryption at rest via `MFA_ENCRYPTION_KEY`. MFA is not yet required at login (enrollment and disable are fully functional).
- **Sessions**: JWT strategy; `User.sessionVersion` in token and DB; “Sign out all sessions” increments version and invalidates all JWTs.
- **Destructive actions**: Delete workspace (owner only) and delete project (owner/admin) require name confirmation in UI and server-side role checks; APIs return 403 for Forbidden.
- **Roles**: Backend enforces owner/admin for workspace edits, members, billing, delete workspace. Backend enforces non-viewer (ensureCanEditProject) for project PATCH, key create/revoke/rotate, alert rules, Slack webhooks, retention. Viewers get 403 on write APIs and read-only UI where applicable.

---

## 5. Trustworthiness & deferrals

- **Implemented for real**: Workspace/project/account settings above are persisted and authorized; no UI-only placeholders for core flows.
- **UI/backend consistency**: Workspace and project settings show read-only/disabled when user is viewer (or non-admin for workspace general); backend returns 403 for forbidden writes.
- **MFA**: Full TOTP enrollment (QR, verify, backup codes), disable with code; MFA at login not yet enforced (planned).
- **Sessions**: JWT with `sessionVersion`; “Sign out all sessions” invalidates every JWT; no per-device list (JWT is stateless).
- **Workspace invite by email**: Implemented (invite, pending list, revoke, accept at `/invite/accept?token=...`, audit log).
- **Activity log**: AuditLog written for key create/rotate/revoke, member role/remove/invite/revoke/join, workspace/project delete, webhook create/update/remove, alert rule create/update/remove, MFA enable/disable, session revoke-all; workspace Activity page shows last 50.
- **Theme**: Stored in DB via preferences; app still uses localStorage for initial paint; preferences save syncs context and DB for future cross-device.

---

## 6. Settings trustworthiness verdict

**Verdict: Settings are trustworthy for production use.**

- **Permissions**: Enforced server-side for all mutating actions. Viewer cannot edit project or workspace settings; 403 returned. Workspace edits and billing require admin/owner; project delete and workspace delete require owner or owner+admin respectively.
- **Key handling**: Full ingest key only in create/rotate response; never re-exposed. Stored as hash; ingest endpoint does not log the key.
- **Destructive actions**: Delete workspace (owner) and delete project (owner/admin) require confirmation and server checks; no UI-only protection.
- **Scope**: Workspace vs project vs account boundaries are correct; theme, profile, MFA, and sessions are account-scoped; billing, members, invites, notifications, and activity are workspace-scoped; keys and alerts are project-scoped.
- **Deferral**: MFA at login (requiring TOTP after sign-in) is not yet implemented; enrollment and disable are real and persisted.

---

## 7. Navigation

- **Dashboard header** (account dropdown): Project settings, Workspace settings, Billing, Account settings, Sign out.
- **Settings shells**: Sidebar + breadcrumbs for workspace, project, and account settings.

---

## 8. Files touched (summary)

- **Prisma**: `schema.prisma` (Workspace.slackWebhookUrl, WorkspaceInvite, User.sessionVersion, User.mfa*); migrations `20250307180000_settings_system`, `20250307200000_invites_and_workspace_slack`, `20250307210000_user_session_version`, `20250307220000_user_mfa`.
- **Lib**: `workspace.ts` (updateWorkspace slackWebhookUrl); `workspace-invite.ts` (createInvite, listPendingInvites, revokeInvite, getInviteByToken, acceptInvite); `workspace-invite-email.ts` (sendInviteEmail); `audit.ts` (writeAuditLog, getWorkspaceActivity, getProjectActivity, getUserActivity); `mfa.ts` (TOTP secret/verify, backup codes, encrypt/decrypt).
- **API routes**: workspaces `[workspaceId]` (PATCH slackWebhookUrl), `invites`, `invites/[inviteId]`, `activity`, `notifications/test`; `invite` (GET), `invite/accept` (POST); account `mfa/status`, `mfa/enroll/start`, `mfa/enroll/verify`, `mfa/disable`, `sessions/revoke-all`. Audit writes in keys, keys/rotate, keys/[keyId], members/[memberId], workspace DELETE, project DELETE, webhooks/slack, alert-rules, mfa enroll/disable, sessions/revoke-all.
- **App**: `dashboard/[workspaceId]/settings/` + `activity`; `invite/accept` (accept invite page).
- **Components**: `workspace-members-client.tsx` (invite form, pending invites); `workspace-notifications-client.tsx`; `workspace-activity-client.tsx`; `account-security-client.tsx` (MFA enroll/disable); `invite-accept-client.tsx`; `sign-out-all-button.tsx` (RevokeAllSessionsButton).
- **Auth**: `auth.ts` (JWT/session callbacks with sessionVersion check).

---

## 9. Implementation audit (post-hardening)

Verified from code (not README claims):

| Area | Status | Notes |
|------|--------|--------|
| **Audit log** | **Fully real** | `writeAuditLog` in lib; wired in keys, members, webhooks, alert rules, workspace/project delete, MFA, session revoke. Activity UI at workspace Settings → Activity. |
| **Team invites** | **Fully real** | `WorkspaceInvite` model; invite by email (role), pending list, revoke; accept at `/invite/accept?token=...`; email sent via SMTP/Resend; permission: admin/owner only. |
| **Session management** | **Fully real** | `User.sessionVersion`; JWT/session callbacks validate version; “Sign out all sessions” increments version and signs out; no per-device list (JWT stateless). |
| **Workspace notifications** | **Fully real** | `Workspace.slackWebhookUrl`; PATCH workspace; test button calls `POST /api/workspaces/[id]/notifications/test`; persistence in DB. |
| **MFA** | **Real (enrollment/disable)** | TOTP (speakeasy), QR (otpauthUrl), backup codes (hashed, one-time); enable/disable with code; optional encryption at rest. **Not yet**: MFA required at login (planned). |
| **Security pages** | **Trustworthy** | No fake placeholders; MFA and sessions describe actual behavior; Integrations points to Notifications for workspace Slack. |

**Trustworthiness verdict after fixes:** Settings are production-ready for serious beta. Permissions, keys, destructive actions, invites, activity log, session invalidation, workspace Slack, and MFA (enroll/disable) are implemented end-to-end with backend, DB, and persistence. The only deferred piece is MFA verification at login; enrollment and backup codes are real and stored.
