import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_00000000000000000000000000000000000000000000000000', {
  apiVersion: '2026-04-22.dahlia',
});

export const PRICE_IDS = {
  solo:   { monthly: process.env.STRIPE_SOLO_MONTHLY_PRICE_ID ?? '',   annual: process.env.STRIPE_SOLO_ANNUAL_PRICE_ID ?? ''   },
  studio: { monthly: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID ?? '', annual: process.env.STRIPE_STUDIO_ANNUAL_PRICE_ID ?? '' },
  agency: { monthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID ?? '', annual: process.env.STRIPE_AGENCY_ANNUAL_PRICE_ID ?? '' },
} as const;

export function getPlanFromPriceId(priceId: string): string {
  for (const [plan, prices] of Object.entries(PRICE_IDS)) {
    if (Object.values(prices).includes(priceId as never)) return plan;
  }
  return 'free';
}
