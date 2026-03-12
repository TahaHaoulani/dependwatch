-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "BillingOverageRecord_workspaceId_periodStart_key" ON "BillingOverageRecord"("workspaceId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "BillingOverageRecord_stripeInvoiceItemId_key" ON "BillingOverageRecord"("stripeInvoiceItemId");

-- CreateIndex
CREATE INDEX "BillingOverageRecord_workspaceId_idx" ON "BillingOverageRecord"("workspaceId");

-- CreateIndex
CREATE INDEX "BillingOverageRecord_periodStart_idx" ON "BillingOverageRecord"("periodStart");

-- AddForeignKey
ALTER TABLE "BillingOverageRecord" ADD CONSTRAINT "BillingOverageRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
