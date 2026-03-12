-- AlterTable WaitlistEntry: add status, updatedAt, optional fields, metadata for lifecycle and traction
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "useCase" TEXT;
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "referralSource" TEXT;
ALTER TABLE "WaitlistEntry" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateIndex (idempotent: only create if not exists via separate migration convention)
CREATE INDEX IF NOT EXISTS "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");
