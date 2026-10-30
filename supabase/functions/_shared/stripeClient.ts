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
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  })
  return cached
}

export type PaidTier = 'basic' | 'pro' | 'enterprise'

/** Stripe Price ids for the two self-serve paid tiers, created in the Stripe Dashboard (Products). */
export function getPriceId(tier: PaidTier): string {
  const envKey = tier === 'basic' ? 'STRIPE_PRICE_BASIC' : tier === 'pro' ? 'STRIPE_PRICE_PRO' : 'STRIPE_PRICE_BUSINESS'
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
  if (priceId === Deno.env.get('STRIPE_PRICE_BUSINESS')) return 'enterprise'
  return null
}

export type AddonKind = 'pages' | 'questions' | 'storage' | 'seats'
export const ADDONS = {
  pages: { cents: 200, recurring: false, env: 'STRIPE_PRICE_ADDON_PAGES' },
  questions: { cents: 300, recurring: false, env: 'STRIPE_PRICE_ADDON_QUESTIONS' },
  storage: { cents: 200, recurring: true, env: 'STRIPE_PRICE_ADDON_STORAGE' },
  seats: { cents: 500, recurring: true, env: 'STRIPE_PRICE_ADDON_SEATS' },
} as const
export function getAddonPrice(kind: AddonKind): string {
  const value = Deno.env.get(ADDONS[kind].env)
  if (!value) throw new Error(`${ADDONS[kind].env} is not configured.`)
  return value
}
export async function validatePrice(priceId: string, cents: number, recurring: boolean) {
  const price = await getStripeClient().prices.retrieve(priceId)
  if (!price.active || price.currency !== 'eur' || price.unit_amount !== cents || price.tax_behavior !== 'inclusive'
    || (recurring ? price.recurring?.interval !== 'month' || price.recurring?.interval_count !== 1 : price.type !== 'one_time')) {
    throw new Error('Checkout is unavailable: configure the current EUR, VAT-inclusive price before accepting payment.')
  }
}
export function appOrigin(): string {
  const url = Deno.env.get('APP_URL')
  if (!url) throw new Error('APP_URL must be configured for safe checkout redirects.')
  return new URL(url).origin
}
