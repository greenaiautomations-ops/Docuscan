// Subscription tier definitions and entitlement logic (Deno/Edge Function
// copy). Kept in sync by hand with src/utils/entitlements.ts — Deno can't
// import from src/, so this pure-logic module is duplicated rather than
// shared. This is the copy Edge Functions must actually trust for
// gating Translate/Explain/Ask AI; the frontend copy is for UI only.

export type Tier = 'free' | 'basic' | 'pro' | 'enterprise'

export interface TierDefinition {
  id: Tier
  documentLimit: number | null
  translation: boolean
  explain: boolean
  askAi: boolean
}

export const TIERS: Record<Tier, TierDefinition> = {
  free: { id: 'free', documentLimit: 10, translation: false, explain: false, askAi: false },
  basic: { id: 'basic', documentLimit: 100, translation: true, explain: true, askAi: false },
  pro: { id: 'pro', documentLimit: 1000, translation: true, explain: true, askAi: true },
  enterprise: { id: 'enterprise', documentLimit: null, translation: true, explain: true, askAi: true },
}

export interface Entitlements {
  tier: Tier
  documentLimit: number | null
  translation: boolean
  explain: boolean
  askAi: boolean
  isAdmin: boolean
  isCompAccess: boolean
}

export interface ProfileSubscriptionFields {
  role: string
  subscription_tier: string
  subscription_status: string
  is_comp_access: boolean
}

const ACTIVE_STATUSES = new Set(['active', 'trialing'])

export function computeEntitlements(profile: ProfileSubscriptionFields): Entitlements {
  if (profile.role === 'admin') {
    return { tier: 'enterprise', documentLimit: null, translation: true, explain: true, askAi: true, isAdmin: true, isCompAccess: false }
  }

  if (profile.is_comp_access) {
    const pro = TIERS.pro
    return {
      tier: 'pro',
      documentLimit: pro.documentLimit,
      translation: pro.translation,
      explain: pro.explain,
      askAi: pro.askAi,
      isAdmin: false,
      isCompAccess: true,
    }
  }

  const rawTier = (TIERS[profile.subscription_tier as Tier] ? profile.subscription_tier : 'free') as Tier
  const isActive = ACTIVE_STATUSES.has(profile.subscription_status)
  const effectiveTier: Tier = isActive ? rawTier : 'free'
  const def = TIERS[effectiveTier]

  return {
    tier: effectiveTier,
    documentLimit: def.documentLimit,
    translation: def.translation,
    explain: def.explain,
    askAi: def.askAi,
    isAdmin: false,
    isCompAccess: false,
  }
}

// deno-lint-ignore no-explicit-any
export async function getCallerEntitlements(supabase: any, userId: string): Promise<Entitlements> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, subscription_tier, subscription_status, is_comp_access')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) {
    // Fail closed: if we can't confirm entitlements, treat as Free rather
    // than silently granting paid features.
    return computeEntitlements({ role: 'user', subscription_tier: 'free', subscription_status: 'active', is_comp_access: false })
  }

  return computeEntitlements(data)
}
