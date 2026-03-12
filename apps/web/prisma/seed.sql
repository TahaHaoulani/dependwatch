-- DependWatch seed data (PostgreSQL)
-- Run after migrations.sql. Idempotent: safe to run multiple times.
--   psql $DATABASE_URL -f prisma/seed.sql

-- Provider catalog: known APIs with default cost models
INSERT INTO "ProviderCatalog" (
  "id",
  "slug",
  "displayName",
  "category",
  "costModel",
  "defaultCostPerCallUsd",
  "defaultCostPer1kUsd",
  "metadata",
  "createdAt",
  "updatedAt"
)
VALUES
  (gen_random_uuid()::text, 'openai', 'OpenAI', 'ai', 'per_1k_units', NULL, 0.002, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'anthropic', 'Anthropic', 'ai', 'per_1k_units', NULL, 0.003, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'stripe', 'Stripe', 'payments', 'fixed_per_call', 0, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'twilio', 'Twilio', 'communications', 'fixed_per_call', 0.0075, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'resend', 'Resend', 'email', 'fixed_per_call', 0.0001, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'clerk', 'Clerk', 'auth', 'fixed_per_call', 0, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'supabase', 'Supabase', 'database', 'fixed_per_call', 0, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'posthog', 'PostHog', 'analytics', 'fixed_per_call', 0, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'sentry', 'Sentry', 'observability', 'fixed_per_call', 0, NULL, NULL, NOW(), NOW()),
  (gen_random_uuid()::text, 'custom', 'Custom API', 'custom', 'custom', NULL, NULL, NULL, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "category" = EXCLUDED."category",
  "costModel" = EXCLUDED."costModel",
  "defaultCostPerCallUsd" = EXCLUDED."defaultCostPerCallUsd",
  "defaultCostPer1kUsd" = EXCLUDED."defaultCostPer1kUsd",
  "updatedAt" = NOW();
