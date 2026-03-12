-- CreateTable
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

-- CreateIndex
CREATE INDEX "ApiIncident_projectId_idx" ON "ApiIncident"("projectId");

-- CreateIndex
CREATE INDEX "ApiIncident_projectId_status_idx" ON "ApiIncident"("projectId", "status");

-- AddForeignKey
ALTER TABLE "ApiIncident" ADD CONSTRAINT "ApiIncident_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
