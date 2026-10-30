import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import { ADDONS, appOrigin, getAddonPrice, getStripeClient, validatePrice, type AddonKind } from '../_shared/stripeClient.ts'
Deno.serve(async req => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  try {
    const client = getUserClient(req)
    const user = await requireUser(client)
    const { kind } = await req.json() as { kind: AddonKind }
    if (!Object.prototype.hasOwnProperty.call(ADDONS, kind)) throw new HttpError(400, 'Unknown add-on.')
    const { data: profile, error } = await client.from('profiles').select('stripe_customer_id,subscription_tier,subscription_status').eq('user_id', user.id).single()
    if (error) throw error
    if (kind === 'seats' && !(profile.subscription_tier === 'enterprise' && ['active','trialing'].includes(profile.subscription_status))) throw new HttpError(403, 'Additional seats require an active Business plan.')
    const priceId = getAddonPrice(kind)
    const definition = ADDONS[kind]
    await validatePrice(priceId, definition.cents, definition.recurring)
    const metadata = { supabase_user_id: user.id, addon: kind }
    const origin = appOrigin()
    const session = await getStripeClient().checkout.sessions.create({
      mode: definition.recurring ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(profile.stripe_customer_id ? { customer: profile.stripe_customer_id } : { customer_email: user.email }),
      client_reference_id: user.id, metadata,
      ...(definition.recurring ? { subscription_data: { metadata } } : {}),
      automatic_tax: { enabled: true }, billing_address_collection: 'required',
      success_url: `${origin}/billing?checkout=success`, cancel_url: `${origin}/billing?checkout=canceled`,
    })
    if (!session.url) throw new Error('Checkout URL unavailable.')
    return jsonResponse({ url: session.url })
  } catch (error) { return jsonResponse({ error: error instanceof Error ? error.message : 'Checkout failed.' }, error instanceof HttpError ? error.status : 500) }
})
