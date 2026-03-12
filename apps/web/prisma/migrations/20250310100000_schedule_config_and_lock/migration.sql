-- CreateTable
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

-- CreateTable
CREATE TABLE "SchedulerLock" (
    "id" TEXT NOT NULL,
    "lockKey" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectScheduleConfig_projectId_key" ON "ProjectScheduleConfig"("projectId");

-- CreateIndex
CREATE INDEX "ProjectScheduleConfig_projectId_idx" ON "ProjectScheduleConfig"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SchedulerLock_lockKey_key" ON "SchedulerLock"("lockKey");

-- CreateIndex
CREATE INDEX "SchedulerLock_lockKey_idx" ON "SchedulerLock"("lockKey");

-- CreateIndex
CREATE INDEX "SchedulerLock_expiresAt_idx" ON "SchedulerLock"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProjectScheduleConfig" ADD CONSTRAINT "ProjectScheduleConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
