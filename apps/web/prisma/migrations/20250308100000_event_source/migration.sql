-- Add source column to ApiCallEvent: 'sdk' (from ingest API) or 'demo' (from Send test events).
-- Demo events appear in dashboards but are excluded from usage, cost, and API counting.
ALTER TABLE "ApiCallEvent" ADD COLUMN "source" VARCHAR(32) NOT NULL DEFAULT 'sdk';

CREATE INDEX "ApiCallEvent_projectId_source_idx" ON "ApiCallEvent"("projectId", "source");
