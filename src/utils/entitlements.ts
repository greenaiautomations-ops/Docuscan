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

export interface TierDefinition {
  id: Tier
  label: string
  /** Price in EUR/month. null = no self-serve price (Enterprise: "Contact us"). */
  priceEuros: number | null
  /** null = unlimited. */
  documentLimit: number | null
  translation: boolean
  explain: boolean
  askAi: boolean
  tagline: string
  features: string[]
  highlight?: boolean
}

export const TIERS: Record<Tier, TierDefinition> = {
  free: {
    id: 'free',
    label: 'Free',
    priceEuros: 0,
    documentLimit: 10,
    translation: false,
    explain: false,
    askAi: false,
    tagline: 'Try Docuscan with your first documents.',
    features: ['Up to 10 documents', 'OCR, classification & extraction', 'AI summary', 'Calendar, deadlines & payments'],
  },
  basic: {
    id: 'basic',
    label: 'Basic',
    priceEuros: 5,
    documentLimit: 100,
    translation: true,
    explain: true,
    askAi: false,
    tagline: 'For regularly organizing personal or household documents.',
    features: [
      'Up to 100 documents',
      'Everything in Free',
      'Explain in plain language',
      'Translate documents',
      'Ask AI not included',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceEuros: 14.99,
    documentLimit: 1000,
    translation: true,
    explain: true,
    askAi: true,
    tagline: 'Full access for power users and small teams.',
    features: ['Up to 1,000 documents', 'Everything in Basic', 'Ask AI — chat with any document', 'Priority support'],
    highlight: true,
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    priceEuros: null,
    documentLimit: null,
    translation: true,
    explain: true,
    askAi: true,
    tagline: 'Custom volume, security, and support — by consultation and agreement.',
    features: ['Unlimited documents', 'Everything in Pro', 'Dedicated onboarding', 'Custom agreement & invoicing'],
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

export function formatTierPrice(tier: TierDefinition): string {
  if (tier.priceEuros === null) return 'Contact us'
  if (tier.priceEuros === 0) return 'Free'
  return `€${tier.priceEuros}/mo`
}
