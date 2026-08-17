// Subscription tier definitions and entitlement logic.
//
// Kept in sync by hand with supabase/functions/_shared/entitlements.ts
// (Deno can't import from src/, so this pure-logic module is duplicated
// rather than shared — it's small and framework-free specifically so that
// staying in sync is easy). The database is the source of truth for a
// user's actual tier; this module only computes what that tier is allowed
// to do. Real enforcement lives server-side (Postgres trigger for document
// limits, Edge Function checks for Translate/Explain/Ask AI) — this is for
// UI decisions (what to show/hide/disable) and must never be trusted alone.

export type Tier = 'free' | 'basic' | 'pro' | 'enterprise'

/** Tiers that are actually purchasable via Stripe Checkout (Free has no checkout; Enterprise is sales-assisted). */
export type PaidTier = 'basic' | 'pro'

// Display text (label/tagline/features) intentionally lives in the i18n
// locale files (`billing.tiers.<tier>.*` in src/i18n/locales/*.json), not
// here — this module only holds the numeric/boolean facts every tier card
// needs (price, limits, feature flags), so it stays framework-free and easy
// to keep in sync with the Deno copy. Components look up display text via
// `t(\`billing.tiers.\${tier.id}.label\`)` etc.
export interface TierDefinition {
  id: Tier
  /** Price in EUR/month. null = no self-serve price (Enterprise: "Contact us"). */
  priceEuros: number | null
  /** null = unlimited. */
  documentLimit: number | null
  translation: boolean
  explain: boolean
  askAi: boolean
  highlight?: boolean
}

export const TIERS: Record<Tier, TierDefinition> = {
  free: {
    id: 'free',
    priceEuros: 0,
    documentLimit: 10,
    translation: false,
    explain: false,
    askAi: false,
  },
  basic: {
    id: 'basic',
    priceEuros: 5,
    documentLimit: 100,
    translation: true,
    explain: true,
    askAi: false,
  },
  pro: {
    id: 'pro',
    priceEuros: 14.99,
    documentLimit: 1000,
    translation: true,
    explain: true,
    askAi: true,
    highlight: true,
  },
  enterprise: {
    id: 'enterprise',
    priceEuros: null,
    documentLimit: null,
    translation: true,
    explain: true,
    askAi: true,
  },
}

export const TIER_ORDER: Tier[] = ['free', 'basic', 'pro', 'enterprise']

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

/**
 * Resolves what a user can actually do right now. Admins get full access.
 * Comp-access (admin-granted testing) accounts get Pro-level access without
 * paying. Everyone else gets their paid tier only while the subscription is
 * active/trialing — a lapsed subscription (past_due/canceled/incomplete)
 * falls back to Free entitlements until it's fixed.
 */
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

/** `t` is a plain (key: string) => string function — pass react-i18next's `t` from the caller. */
export function formatTierPrice(tier: TierDefinition, t: (key: string) => string): string {
  if (tier.priceEuros === null) return t('billing.contactUs')
  if (tier.priceEuros === 0) return t('billing.free')
  return `€${tier.priceEuros}${t('billing.perMonth')}`
}
