import Stripe from 'stripe';
import { EVENT_LIMITS } from './pricing-constants';
import { validateStripeConfig } from './config';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  validateStripeConfig();
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
  get customers() {
    return getStripe().customers;
  },
  get subscriptions() {
    return getStripe().subscriptions;
  },
};

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceId: null as string | null,
    priceMonthly: 0,
    eventsPerMonth: EVENT_LIMITS.free,
    providers: 2,
    retentionDays: 7,
    emailAlerts: false,
    slackAlerts: false,
    anomalyAlerts: false,
    operationAnalytics: false,
    apiIntelligence: false,
    dependencyGraph: false,
  },
  builder: {
    id: 'builder',
    name: 'Pro',
    priceId: process.env.STRIPE_PRICE_BUILDER ?? 'price_builder',
    priceMonthly: 29,
    eventsPerMonth: EVENT_LIMITS.builder,
    providers: 10,
    retentionDays: 90,
    emailAlerts: false,
    slackAlerts: true,
    anomalyAlerts: false,
    operationAnalytics: true,
    apiIntelligence: true,
    dependencyGraph: true,
  },
  startup: {
    id: 'startup',
    name: 'Scale',
    priceId: process.env.STRIPE_PRICE_STARTUP ?? 'price_startup',
    priceMonthly: 99,
    eventsPerMonth: EVENT_LIMITS.startup,
    providers: -1,
    retentionDays: 365,
    emailAlerts: false,
    slackAlerts: true,
    anomalyAlerts: true,
    operationAnalytics: true,
    apiIntelligence: true,
    dependencyGraph: true,
  },
} as const;

export type PlanId = keyof typeof PLANS;

export function getPlanById(id: PlanId) {
  return PLANS[id];
}

export function getPlanLimits(planId: string) {
  const plan = PLANS[planId as PlanId] ?? PLANS.free;
  return {
    eventsPerMonth: plan.eventsPerMonth,
    maxProviders: plan.providers,
    retentionDays: plan.retentionDays,
    emailAlerts: plan.emailAlerts,
    slackAlerts: plan.slackAlerts,
    anomalyAlerts: plan.anomalyAlerts,
    operationAnalytics: plan.operationAnalytics,
    apiIntelligence: plan.apiIntelligence,
    dependencyGraph: plan.dependencyGraph,
  };
}
