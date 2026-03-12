import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const providers = [
  { slug: 'openai', displayName: 'OpenAI', category: 'ai', costModel: 'per_1k_units', defaultCostPer1kUsd: 0.002 },
  { slug: 'anthropic', displayName: 'Anthropic', category: 'ai', costModel: 'per_1k_units', defaultCostPer1kUsd: 0.003 },
  { slug: 'stripe', displayName: 'Stripe', category: 'payments', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0 },
  { slug: 'twilio', displayName: 'Twilio', category: 'communications', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0.0075 },
  { slug: 'resend', displayName: 'Resend', category: 'email', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0.0001 },
  { slug: 'clerk', displayName: 'Clerk', category: 'auth', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0 },
  { slug: 'supabase', displayName: 'Supabase', category: 'database', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0 },
  { slug: 'posthog', displayName: 'PostHog', category: 'analytics', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0 },
  { slug: 'sentry', displayName: 'Sentry', category: 'observability', costModel: 'fixed_per_call', defaultCostPerCallUsd: 0 },
  { slug: 'custom', displayName: 'Custom API', category: 'custom', costModel: 'custom', defaultCostPerCallUsd: null },
];

async function main() {
  for (const p of providers) {
    await prisma.providerCatalog.upsert({
      where: { slug: p.slug },
      create: p,
      update: { displayName: p.displayName, category: p.category, costModel: p.costModel, defaultCostPerCallUsd: p.defaultCostPerCallUsd, defaultCostPer1kUsd: p.defaultCostPer1kUsd },
    });
  }
  console.log('Seeded provider catalog');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
