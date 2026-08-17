// Supabase Edge Function: stripe-webhook
// Receives subscription lifecycle events directly from Stripe (never from
// the browser) and is the ONLY place subscription state on `profiles` gets
// written. Every event is signature-verified against STRIPE_WEBHOOK_SECRET
// before anything is trusted — this is the sole authentication mechanism
// here (there is no Supabase Authorization header, because Stripe isn't a
// Supabase-authenticated caller).
//
// Configure in Stripe Dashboard -> Developers -> Webhooks, pointing at:
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// listening for: customer.subscription.created, customer.subscription.updated,
// customer.subscription.deleted, invoice.payment_failed.

import Stripe from 'npm:stripe@14.21.0'
import { jsonResponse } from '../_shared/cors.ts'
import { getInternalServiceClient } from '../_shared/supabaseClient.ts'
import { getStripeClient, tierForPriceId } from '../_shared/stripeClient.ts'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return jsonResponse({ error: 'Webhook is not configured.' }, 500)
  }

  const rawBody = await req.text()
  const stripe = getStripeClient()

  let event: Stripe.Event
  try {
    // constructEventAsync (not the sync constructEvent) is required in
    // Deno — Stripe's default signature verification uses Node's crypto
    // module, which isn't available in the Edge Function runtime.
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature.'
    console.error('Stripe webhook signature verification failed:', message)
    return jsonResponse({ error: `Webhook signature verification failed: ${message}` }, 400)
  }

  // deno-lint-ignore no-explicit-any
  const supabase: any = getInternalServiceClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(supabase, event.data.object as Stripe.Subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id)
        if (error) console.error('Failed to mark subscription canceled:', error.message)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
        if (subId) {
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_subscription_id', subId)
          if (error) console.error('Failed to mark subscription past_due:', error.message)
        }
        break
      }
      default:
        // Not an event we act on — acknowledge so Stripe stops retrying it.
        break
    }
  } catch (err) {
    // Log but still return 200: a bug in our own sync logic shouldn't make
    // Stripe hammer this endpoint with retries indefinitely. Failures here
    // are visible in `supabase functions logs stripe-webhook`.
    console.error('Error processing Stripe webhook event:', event.type, err)
  }

  return jsonResponse({ received: true })
})

async function syncSubscription(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = subscription.metadata?.supabase_user_id
  if (!userId) {
    console.error('Subscription event missing supabase_user_id metadata; skipping.', subscription.id)
    return
  }

  const priceId = subscription.items.data[0]?.price?.id
  const tier = tierForPriceId(priceId) ?? (subscription.metadata?.tier as 'basic' | 'pro' | undefined)
  if (!tier) {
    console.error('Could not resolve tier for subscription (unrecognized price id).', subscription.id, priceId)
    return
  }

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const status = mapStripeStatus(subscription.status)
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_tier: tier,
      subscription_status: status,
      subscription_current_period_end: periodEnd,
    })
    .eq('user_id', userId)

  if (error) console.error('Failed to sync subscription to profile:', error.message)
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' {
  switch (status) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled'
    case 'incomplete':
      return 'incomplete'
    default:
      return 'active'
  }
}
