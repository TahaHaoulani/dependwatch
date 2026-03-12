-- CreateTable
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

-- CreateIndex
CREATE INDEX "ApiPolicy_projectId_idx" ON "ApiPolicy"("projectId");
CREATE INDEX "ApiPolicy_projectId_type_idx" ON "ApiPolicy"("projectId", "type");

-- AddForeignKey
ALTER TABLE "ApiPolicy" ADD CONSTRAINT "ApiPolicy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
