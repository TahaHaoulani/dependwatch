-- Settings system: workspace description, project metadata & retention, API key rotatedAt, user preferences

-- Workspace: optional description
ALTER TABLE "Workspace" ADD COLUMN "description" TEXT;

-- Project: description, environment, retention override (nullable; plan default when null)
ALTER TABLE "Project" ADD COLUMN "description" TEXT;
ALTER TABLE "Project" ADD COLUMN "environment" TEXT;
ALTER TABLE "Project" ADD COLUMN "retentionDaysOverride" INTEGER;

-- ProjectApiKey: when key was rotated (null = never rotated)
ALTER TABLE "ProjectApiKey" ADD COLUMN "rotatedAt" TIMESTAMP(3);

-- User preferences (theme, timezone, etc.) — one row per user
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