import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { invokeFunction } from '../../lib/functionsClient'
export function PackageAddons() {
  const { t } = useTranslation()
  const { user, entitlements } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const addons = [{ kind: 'pages', price: '€2', recurring: false }, { kind: 'questions', price: '€3', recurring: false }, { kind: 'storage', price: '€2', recurring: true }, { kind: 'seats', price: '€5', recurring: true }]
  const buy = async (kind: string) => {
    setBusy(kind); setError(null)
    try { const { url } = await invokeFunction<{ url: string }>('create-addon-checkout', { kind }); window.location.assign(url) }
    catch (err) { setError(err instanceof Error ? err.message : t('billingPage.couldNotStartCheckout')); setBusy(null) }
  }
  return <section className="rounded-xl border border-slate-200 p-5 dark:border-slate-700">
    <h2 className="text-xl font-semibold">{t('billing.addonsTitle')}</h2>
    <p className="mt-2 text-sm text-slate-500">{t('billing.addonsNote')}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {addons.map(addon => <div key={addon.kind} className="flex flex-col justify-between gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
        <h3 className="text-sm font-semibold">{t(`billing.addons.${addon.kind}`)}</h3>
        <p className="text-lg font-semibold">{addon.price}{addon.recurring ? t('billing.perMonth') : ''}</p>
        {!user ? <Link className="text-sm text-indigo-600 underline" to="/login">{t('home.nav.signIn')}</Link> : addon.kind === 'seats' && entitlements.tier !== 'enterprise' ? <Link className="text-sm text-indigo-600 underline" to="/billing">{t('teams.businessRequired')}</Link> :
          <button className="min-h-11 rounded-lg border border-indigo-300 px-3 py-2 text-sm text-indigo-600 disabled:opacity-50" disabled={busy !== null} onClick={() => void buy(addon.kind)}>{busy === addon.kind ? t('billingPage.redirecting') : t('billing.buyAddon')}</button>}
      </div>)}
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </section>
}
