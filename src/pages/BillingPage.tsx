import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createCheckoutSession, createPortalSession } from '../services/subscriptionService'
import { TIERS, TIER_ORDER, formatTierPrice, type PaidTier, type Tier } from '../utils/entitlements'
import { ErrorMessage } from '../components/common/ErrorMessage'

const CONTACT_EMAIL = 'zoraiz1002@gmail.com'

function TierCard({
  tier,
  currentTier,
  isPaidActive,
  busy,
  onSubscribe,
  onManage,
}: {
  tier: Tier
  currentTier: Tier
  isPaidActive: boolean
  busy: boolean
  onSubscribe: (tier: PaidTier) => void
  onManage: () => void
}) {
  const def = TIERS[tier]
  const isCurrent = tier === currentTier
  const isPurchasable = tier === 'basic' || tier === 'pro'

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border p-5 ${
        def.highlight
          ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5 ring-1 ring-indigo-200 dark:ring-indigo-500/30'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
      }`}
    >
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{def.label}</h3>
          {isCurrent && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Current plan
            </span>
          )}
        </div>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{formatTierPrice(def)}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{def.tagline}</p>
      </div>

      <ul className="flex flex-1 flex-col gap-2 text-sm text-slate-600 dark:text-slate-400">
        {def.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {tier === 'enterprise' ? (
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=Docuscan Enterprise`}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Contact us
        </a>
      ) : isCurrent && isPaidActive ? (
        <button
          onClick={onManage}
          disabled={busy}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
        >
          Manage subscription
        </button>
      ) : isCurrent ? (
        <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          You're on this plan
        </span>
      ) : isPurchasable ? (
        <button
          onClick={() => onSubscribe(tier as PaidTier)}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Redirecting…' : `Subscribe to ${def.label}`}
        </button>
      ) : null}
    </div>
  )
}

export function BillingPage() {
  const { profile, entitlements } = useAuth()
  const [searchParams] = useSearchParams()
  const [busyTier, setBusyTier] = useState<Tier | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkoutResult = searchParams.get('checkout')

  const currentTier = entitlements.tier
  const isPaidActive =
    !entitlements.isAdmin &&
    !entitlements.isCompAccess &&
    (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing')

  const statusLabel = useMemo(() => {
    if (entitlements.isAdmin) return 'Admin — full access'
    if (entitlements.isCompAccess) return 'Complimentary access (granted by admin)'
    if (!profile) return null
    if (profile.subscription_tier === 'free') return 'Free plan'
    const statusText: Record<string, string> = {
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Payment past due — please update your payment method',
      canceled: 'Canceled — you have Free plan access',
      incomplete: 'Payment incomplete',
    }
    return `${TIERS[profile.subscription_tier].label} plan — ${statusText[profile.subscription_status] ?? profile.subscription_status}`
  }, [profile, entitlements])

  const handleSubscribe = async (tier: PaidTier) => {
    setError(null)
    setBusyTier(tier)
    try {
      const { url } = await createCheckoutSession(tier)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.')
      setBusyTier(null)
    }
  }

  const handleManage = async () => {
    setError(null)
    setBusyTier(currentTier)
    try {
      const { url } = await createPortalSession()
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the billing portal.')
      setBusyTier(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Billing & plans</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your subscription and see what each plan includes.
        </p>
      </div>

      {checkoutResult === 'success' && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
          Thanks! Your subscription is being activated — this can take a few seconds to reflect below.
        </div>
      )}
      {checkoutResult === 'canceled' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-400">
          Checkout was canceled — no changes were made to your plan.
        </div>
      )}

      {statusLabel && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your plan</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{statusLabel}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {entitlements.documentLimit === null
                ? 'Unlimited documents'
                : `Document limit: ${entitlements.documentLimit}`}
            </p>
          </div>
          {isPaidActive && (
            <button
              onClick={handleManage}
              disabled={busyTier !== null}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
            >
              Manage subscription
            </button>
          )}
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TIER_ORDER.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            currentTier={currentTier}
            isPaidActive={isPaidActive}
            busy={busyTier === tier}
            onSubscribe={handleSubscribe}
            onManage={handleManage}
          />
        ))}
      </div>
    </div>
  )
}
