import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { updateProfile } from '../services/profileService'
import { ReminderSettings } from '../components/events/ReminderSettings'
import { useTheme } from '../hooks/useTheme'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '../i18n'
import type { ThemePreference } from '../contexts/ThemeContext'

// Language names shown as autonyms (each language's own name for itself) —
// standard UX for a language picker, so a user can find their language
// regardless of what the UI is currently displaying in.
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'ur', label: 'اردو' },
]

const APP_LANGUAGE_LABELS: Record<Language, string> = { en: 'English', de: 'Deutsch' }

export function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t, i18n } = useTranslation()
  const [name, setName] = useState(profile?.name ?? '')
  const [preferredLanguage, setPreferredLanguage] = useState(profile?.preferred_language ?? 'en')
  const [timezone, setTimezone] = useState(
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'light', label: t('theme.light') },
    { value: 'dark', label: t('theme.dark') },
    { value: 'system', label: t('theme.system') },
  ]

  const currentAppLanguage = (SUPPORTED_LANGUAGES.includes(i18n.language as Language) ? i18n.language : 'en') as Language

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await updateProfile(user.id, { name, preferred_language: preferredLanguage, timezone })
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settingsPage.profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('settingsPage.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('settingsPage.subtitle')}</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settingsPage.account.heading')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settingsPage.profile.heading')}</h2>

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('settingsPage.profile.nameLabel')}
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="language" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('settingsPage.profile.documentLanguageLabel')}
          </label>
          <select
            id="language"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('settingsPage.profile.documentLanguageHint')}</p>
        </div>

        <div>
          <label htmlFor="timezone" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('settingsPage.profile.timezoneLabel')}
          </label>
          <input
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('settingsPage.profile.saved')}</p>}

        <button
          type="submit"
          disabled={saving}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? t('common.saving') : t('common.saveChanges')}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settingsPage.appLanguage.heading')}</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('settingsPage.appLanguage.description')}</p>
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                currentAppLanguage === lang
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {APP_LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settingsPage.appearance.heading')}</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{t('settingsPage.appearance.description')}</p>
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                theme === opt.value
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('settingsPage.reminders.heading')}</h2>
        <ReminderSettings />
      </div>
    </div>
  )
}
