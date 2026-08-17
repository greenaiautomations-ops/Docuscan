import { invokeFunction } from '../lib/functionsClient'
import { supabase } from '../lib/supabase'
import type { PaidTier } from '../utils/entitlements'
import type { Profile } from '../types/document'

/** Creates a Stripe Checkout session for the given paid tier and returns the URL to redirect to. */
export async function createCheckoutSession(tier: PaidTier): Promise<{ url: string }> {
  return invokeFunction<{ url: string }>('create-checkout-session', { tier })
}

/** Opens Stripe's hosted Billing Portal (manage payment method, invoices, cancel) for the current subscriber. */
export async function createPortalSession(): Promise<{ url: string }> {
  return invokeFunction<{ url: string }>('create-portal-session', {})
}

// ---------------------------------------------------------------------
// Admin — user list + comp-access grants. RLS only allows these reads/
// writes when the caller's own profile has role = 'admin'; everyone else's
// calls here simply return no rows / are rejected by the privileged-update
// trigger, matching the server-side enforcement.
// ---------------------------------------------------------------------

export interface AdminUserRow extends Profile {
  document_count: number
}

/** All users with their subscription state and a live document count, for the admin panel. Admin-only (enforced by RLS). */
export async function listAllUsersForAdmin(): Promise<AdminUserRow[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error

  const { data: docCounts, error: docError } = await supabase.from('documents').select('user_id')
  if (docError) throw docError

  const countByUser = new Map<string, number>()
  for (const row of docCounts ?? []) {
    countByUser.set(row.user_id, (countByUser.get(row.user_id) ?? 0) + 1)
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    document_count: countByUser.get(p.user_id) ?? 0,
  }))
}

export async function setCompAccess(userId: string, enabled: boolean): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_comp_access: enabled })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
