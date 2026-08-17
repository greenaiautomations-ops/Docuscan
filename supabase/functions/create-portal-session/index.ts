// Supabase Edge Function: create-portal-session
// Opens Stripe's hosted Billing Portal so a subscriber can update payment
// details, change plans, view invoices, or cancel — all on Stripe's side,
// with the resulting change flowing back to us via stripe-webhook.

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import { getStripeClient } from '../_shared/stripeClient.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = getUserClient(req)
    const user = await requireUser(supabase)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profileError) throw new HttpError(500, profileError.message)

    if (!profile?.stripe_customer_id) {
      throw new HttpError(409, "You don't have a billing account yet — subscribe to a plan first.")
    }

    const origin = req.headers.get('origin') ?? Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const stripe = getStripeClient()

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/billing`,
    })

    return jsonResponse({ url: session.url })
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status)
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    return jsonResponse({ error: message }, 500)
  }
})
