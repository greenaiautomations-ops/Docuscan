import { useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { Logo } from '../components/common/Logo'
import { ThemeToggle } from '../components/common/ThemeToggle'
import { LanguageToggle } from '../components/common/LanguageToggle'
import { TIERS, TIER_ORDER, formatTierPrice } from '../utils/entitlements'

const FEATURE_KEYS = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6'] as const
const BENEFIT_KEYS = ['item1', 'item2', 'item3', 'item4'] as const
const STEP_KEYS = ['step1', 'step2', 'step3', 'step4'] as const

const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], ReactElement> = {
  item1: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 16.5h6M9 9.5h2" />
    </svg>
  ),
  item2: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14h2M8 17h2" />
    </svg>
  ),
  item3: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z" />
    </svg>
  ),
  item4: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20l1.2-5.2A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M8 10.5h8M8 13.5h5" />
    </svg>
  ),
  item5: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z" />
      <path d="M9.5 12l1.8 1.8L14.8 10" />
    </svg>
  ),
  item6: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l5-5 4 4 8-8M20 8h-5v5" />
    </svg>
  ),
}

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [activeStep, setActiveStep] = useState<(typeof STEP_KEYS)[number]>('step1')

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo size={32} withWordmark />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {t('home.nav.goToDashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-lg px-3.5 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 sm:inline-block"
                >
                  {t('home.nav.signIn')}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {t('home.nav.getStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <span className="inline-flex items-center rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          {t('home.hero.eyebrow')}
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
          {t('home.hero.title')}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">{t('home.hero.subtitle')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={user ? '/dashboard' : '/signup'}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            {user ? t('home.nav.goToDashboard') : t('home.hero.ctaPrimary')}
          </Link>
          {!user && (
            <Link
              to="/login"
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('home.hero.ctaSecondary')}
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{t('home.hero.trustNote')}</p>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t('home.features.title')}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">{t('home.features.subtitle')}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {FEATURE_ICONS[key]}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t(`home.features.${key}.title`)}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{t(`home.features.${key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            {t('home.benefits.title')}
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {BENEFIT_KEYS.map((key, i) => (
              <div key={key} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t(`home.benefits.${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t(`home.benefits.${key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — interactive step tabs */}
      <section className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t('home.howItWorks.title')}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">{t('home.howItWorks.subtitle')}</p>
          </div>

          <div className="mt-10 flex flex-col gap-6 lg:flex-row">
            <div className="flex shrink-0 flex-row gap-2 overflow-x-auto lg:w-64 lg:flex-col lg:overflow-visible">
              {STEP_KEYS.map((key, i) => (
                <button
                  key={key}
                  onClick={() => setActiveStep(key)}
                  className={`flex shrink-0 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors lg:shrink ${
                    activeStep === key
                      ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      activeStep === key ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="whitespace-nowrap font-medium lg:whitespace-normal">{t(`home.howItWorks.${key}.label`)}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t(`home.howItWorks.${activeStep}.title`)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {t(`home.howItWorks.${activeStep}.description`)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{t('home.pricing.title')}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">{t('home.pricing.subtitle')}</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIER_ORDER.map((tier) => {
              const def = TIERS[tier]
              return (
                <div
                  key={tier}
                  className={`flex flex-col gap-3 rounded-xl border p-5 ${
                    def.highlight
                      ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-500/5 ring-1 ring-indigo-200 dark:ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t(`billing.tiers.${tier}.label`)}
                  </h3>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatTierPrice(def, t)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {def.documentLimit === null ? '∞' : def.documentLimit} {t('home.pricing.documentsLabel')}
                  </p>
                  <Link
                    to={user ? '/billing' : '/signup'}
                    className={`mt-auto rounded-lg px-3 py-2 text-center text-xs font-semibold ${
                      tier === 'enterprise'
                        ? 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {tier === 'enterprise' ? t('home.pricing.contactCta') : t('home.pricing.cta')}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      {!user && (
        <section className="border-t border-slate-100 dark:border-slate-800 bg-indigo-600 py-16">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">{t('home.finalCta.title')}</h2>
            <p className="mt-3 text-indigo-100">{t('home.finalCta.subtitle')}</p>
            <Link
              to="/signup"
              className="mt-7 inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              {t('home.finalCta.button')}
            </Link>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-100 dark:border-slate-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:px-6">
          <Logo size={24} withWordmark />
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('home.footer.tagline')}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} DocVault. {t('home.footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  )
}
