// Supabase Edge Function: create-checkout-session
// Starts a Stripe Checkout flow for upgrading to Basic or Pro. Returns a
// hosted Stripe URL for the frontend to redirect to — no card data ever
// touches our own servers or database.
//
// Deliberately does NOT write anything to `profiles` itself: the Stripe
// customer id and subscription state are only ever persisted by the
// stripe-webhook function, once Stripe confirms the event actually
// happened. That keeps a single source of truth and avoids the checkout
// flow racing with (or duplicating) what the webhook does.

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import { getPriceId, getStripeClient, type PaidTier } from '../_shared/stripeClient.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = getUserClient(req)
    const user = await requireUser(supabase)

    const body = await req.json().catch(() => ({}))
    const tier: PaidTier = body.tier

    if (tier !== 'basic' && tier !== 'pro') {
      throw new HttpError(400, 'tier must be "basic" or "pro".')
    }

    const origin = req.headers.get('origin') ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173'

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError) throw new HttpError(500, profileError.message)

    if (
      profile?.subscription_tier === tier &&
      (profile.subscription_status === 'active' || profile.subscription_status === 'trialing')
    ) {
      throw new HttpError(409, `You're already on the ${tier === 'basic' ? 'Basic' : 'Pro'} plan.`)
    }

    const stripe = getStripeClient()
    const priceId = getPriceId(tier)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse the existing Stripe customer if we already have one on file
      // (from a prior subscription), otherwise let Stripe create one and
      // the webhook will record its id on our side.
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }),
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, tier },
      subscription_data: { metadata: { supabase_user_id: user.id, tier } },
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=canceled`,
      allow_promotion_codes: true,
    })

    if (!session.url) throw new HttpError(500, 'Stripe did not return a checkout URL.')

    return jsonResponse({ url: session.url })
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status)
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    return jsonResponse({ error: message }, 500)
  }
})
