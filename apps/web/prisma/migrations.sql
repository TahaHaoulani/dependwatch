-- DependWatch full schema (PostgreSQL) — single migration for first production deploy.
-- Run on an empty database, e.g.: psql $DATABASE_URL -f prisma/migrations.sql
-- Generated from current schema; replaces incremental migrations for greenfield deploy.

-- ============ Auth (NextAuth) ============
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "totpSecretEncrypted" TEXT,
    "pendingTotpSecretEncrypted" TEXT,
    "backupCodesHashed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Workspace & Projects ============
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "slackWebhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'developer',
    "invitedByUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "environment" TEXT,
    "retentionDaysOverride" INTEGER,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectScheduleConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT,
    "digestTimeOfDay" TEXT,
    "digestTimezone" TEXT DEFAULT 'UTC',
    "digestDayOfWeek" INTEGER,
    "lastDigestAt" TIMESTAMP(3),
    "alertEvaluationFrequencyMinutes" INTEGER,
    "lastAlertEvaluationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectScheduleConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulerLock" (
    "id" TEXT NOT NULL,
    "lockKey" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerLock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "environmentTag" TEXT,

    CONSTRAINT "ProjectApiKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE INDEX "WorkspaceInvite_tokenHash_idx" ON "WorkspaceInvite"("tokenHash");
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");
CREATE INDEX "WorkspaceInvite_workspaceId_email_idx" ON "WorkspaceInvite"("workspaceId", "email");
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE UNIQUE INDEX "Project_workspaceId_slug_key" ON "Project"("workspaceId", "slug");
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
CREATE INDEX "Project_archivedAt_idx" ON "Project"("archivedAt");
CREATE UNIQUE INDEX "ProjectScheduleConfig_projectId_key" ON "ProjectScheduleConfig"("projectId");
CREATE INDEX "ProjectScheduleConfig_projectId_idx" ON "ProjectScheduleConfig"("projectId");
CREATE UNIQUE INDEX "SchedulerLock_lockKey_key" ON "SchedulerLock"("lockKey");
CREATE INDEX "SchedulerLock_lockKey_idx" ON "SchedulerLock"("lockKey");
CREATE INDEX "SchedulerLock_expiresAt_idx" ON "SchedulerLock"("expiresAt");
CREATE INDEX "ProjectApiKey_projectId_idx" ON "ProjectApiKey"("projectId");
CREATE INDEX "ProjectApiKey_keyPrefix_idx" ON "ProjectApiKey"("keyPrefix");

ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectScheduleConfig" ADD CONSTRAINT "ProjectScheduleConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectApiKey" ADD CONSTRAINT "ProjectApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Provider catalog & cost ============
CREATE TABLE "ProviderCatalog" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT,
    "costModel" TEXT,
    "defaultCostPerCallUsd" DECIMAL(12,6),
    "defaultCostPer1kUsd" DECIMAL(12,6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectProviderConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "providerSlug" TEXT NOT NULL,
    "costPerCallUsd" DECIMAL(12,6),
    "costPer1kUsd" DECIMAL(12,6),
    "customLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderCatalog_slug_key" ON "ProviderCatalog"("slug");
CREATE INDEX "ProviderCatalog_slug_idx" ON "ProviderCatalog"("slug");
CREATE UNIQUE INDEX "ProjectProviderConfig_projectId_providerSlug_key" ON "ProjectProviderConfig"("projectId", "providerSlug");
CREATE INDEX "ProjectProviderConfig_projectId_idx" ON "ProjectProviderConfig"("projectId");

ALTER TABLE "ProjectProviderConfig" ADD CONSTRAINT "ProjectProviderConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Events ============
CREATE TABLE "ApiCallEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "serviceName" TEXT,
    "endpoint" TEXT,
    "method" TEXT,
    "environment" TEXT,
    "durationMs" INTEGER,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "errorMessage" VARCHAR(512),
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "estimatedCostUsd" DECIMAL(12,6),
    "metadata" JSONB,
    "region" TEXT,
    "source" VARCHAR(32) NOT NULL DEFAULT 'sdk',

    CONSTRAINT "ApiCallEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiCallEvent_projectId_timestamp_idx" ON "ApiCallEvent"("projectId", "timestamp");
CREATE INDEX "ApiCallEvent_projectId_provider_timestamp_idx" ON "ApiCallEvent"("projectId", "provider", "timestamp");
CREATE INDEX "ApiCallEvent_projectId_success_timestamp_idx" ON "ApiCallEvent"("projectId", "success", "timestamp");
CREATE INDEX "ApiCallEvent_projectId_environment_timestamp_idx" ON "ApiCallEvent"("projectId", "environment", "timestamp");
CREATE INDEX "ApiCallEvent_projectId_source_idx" ON "ApiCallEvent"("projectId", "source");

ALTER TABLE "ApiCallEvent" ADD CONSTRAINT "ApiCallEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Billing ============
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingOverageRecord" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "overageEvents" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "stripeInvoiceItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingOverageRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");
CREATE UNIQUE INDEX "BillingOverageRecord_workspaceId_periodStart_key" ON "BillingOverageRecord"("workspaceId", "periodStart");
CREATE UNIQUE INDEX "BillingOverageRecord_stripeInvoiceItemId_key" ON "BillingOverageRecord"("stripeInvoiceItemId");
CREATE INDEX "BillingOverageRecord_workspaceId_idx" ON "BillingOverageRecord"("workspaceId");
CREATE INDEX "BillingOverageRecord_periodStart_idx" ON "BillingOverageRecord"("periodStart");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BillingOverageRecord" ADD CONSTRAINT "BillingOverageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Alerts ============
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "latencyThresholdMs" INTEGER,
    "errorRateThresholdPercent" DECIMAL(5,2),
    "monthlyBudgetUsd" DECIMAL(12,2),
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SlackWebhookConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlackWebhookConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AlertRule_projectId_idx" ON "AlertRule"("projectId");
CREATE INDEX "AlertEvent_projectId_sentAt_idx" ON "AlertEvent"("projectId", "sentAt");
CREATE INDEX "AlertEvent_ruleId_sentAt_idx" ON "AlertEvent"("ruleId", "sentAt");
CREATE INDEX "SlackWebhookConfig_projectId_idx" ON "SlackWebhookConfig"("projectId");

ALTER TABLE "AlertRule" ADD CONSTRAINT "AlertRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SlackWebhookConfig" ADD CONSTRAINT "SlackWebhookConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Incidents ============
CREATE TABLE "ApiIncident" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedToId" TEXT,
    "note" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiIncident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint" TEXT,
    "detectionType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metrics" JSONB,
    "timeline" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiIncident_projectId_idx" ON "ApiIncident"("projectId");
CREATE INDEX "ApiIncident_projectId_status_idx" ON "ApiIncident"("projectId", "status");
CREATE UNIQUE INDEX "IncidentReport_publicId_key" ON "IncidentReport"("publicId");
CREATE INDEX "IncidentReport_projectId_idx" ON "IncidentReport"("projectId");
CREATE INDEX "IncidentReport_publicId_idx" ON "IncidentReport"("publicId");

ALTER TABLE "ApiIncident" ADD CONSTRAINT "ApiIncident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentReport" ADD CONSTRAINT "IncidentReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ ApiPolicy ============
CREATE TABLE "ApiPolicy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiPolicy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiPolicy_projectId_idx" ON "ApiPolicy"("projectId");
CREATE INDEX "ApiPolicy_projectId_type_idx" ON "ApiPolicy"("projectId", "type");

ALTER TABLE "ApiPolicy" ADD CONSTRAINT "ApiPolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ MCP ============
CREATE TABLE "McpAccessToken" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "scopes" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "McpAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "McpAccessToken_userId_idx" ON "McpAccessToken"("userId");
CREATE INDEX "McpAccessToken_tokenHash_idx" ON "McpAccessToken"("tokenHash");
CREATE INDEX "McpAccessToken_workspaceId_idx" ON "McpAccessToken"("workspaceId");

ALTER TABLE "McpAccessToken" ADD CONSTRAINT "McpAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ User preferences ============
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "dateFormat" TEXT,
    "defaultLandingPage" TEXT,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "billingNotifications" BOOLEAN NOT NULL DEFAULT true,
    "alertDigest" TEXT NOT NULL DEFAULT 'instant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============ Waitlist ============
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'landing',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "name" TEXT,
    "company" TEXT,
    "useCase" TEXT,
    "referralSource" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WaitlistEntry_email_key" ON "WaitlistEntry"("email");
CREATE INDEX "WaitlistEntry_createdAt_idx" ON "WaitlistEntry"("createdAt");
CREATE INDEX "WaitlistEntry_source_idx" ON "WaitlistEntry"("source");
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- ============ Audit ============
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
