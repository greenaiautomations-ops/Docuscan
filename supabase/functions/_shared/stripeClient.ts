// Thin Stripe client wrapper for Edge Functions. Uses Stripe's fetch-based
// HTTP client (Stripe.createFetchHttpClient()) because Deno's runtime
// doesn't support the Node HTTP client the Stripe SDK defaults to — this is
// Stripe's own documented pattern for Deno/Supabase Edge Functions.

import Stripe from 'npm:stripe@14.21.0'

let cached: Stripe | null = null

export function getStripeClient(): Stripe {
  if (cached) return cached

  const key = Deno.env.get('STRIPE_SECRET_KEY')
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not configured. Set it with `supabase secrets set STRIPE_SECRET_KEY=sk_...` ' +
        '(Stripe Dashboard -> Developers -> API keys). Use a test-mode key (sk_test_...) until you are ready to go live.',
    )
  }

  cached = new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })
  return cached
}

export type PaidTier = 'basic' | 'pro'

/** Stripe Price ids for the two self-serve paid tiers, created in the Stripe Dashboard (Products). */
export function getPriceId(tier: PaidTier): string {
  const envKey = tier === 'basic' ? 'STRIPE_PRICE_BASIC' : 'STRIPE_PRICE_PRO'
  const priceId = Deno.env.get(envKey)
  if (!priceId) {
    throw new Error(
      `${envKey} is not configured. Set it with \`supabase secrets set ${envKey}=price_...\` ` +
        '(Stripe Dashboard -> Product catalog -> the price\'s API ID).',
    )
  }
  return priceId
}

/** Reverse lookup: given a Stripe Price id from a webhook event, which of our tiers is it? */
export function tierForPriceId(priceId: string | null | undefined): PaidTier | null {
  if (!priceId) return null
  if (priceId === Deno.env.get('STRIPE_PRICE_BASIC')) return 'basic'
  if (priceId === Deno.env.get('STRIPE_PRICE_PRO')) return 'pro'
  return null
}
