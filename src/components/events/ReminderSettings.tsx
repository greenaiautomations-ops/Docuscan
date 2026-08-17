import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { getNotificationPreferences, updateNotificationPreferences } from '../../services/notificationPreferencesService'
import type { NotificationPreferences } from '../../types/document'

const OPTION_KEYS = ['seven_days', 'three_days', 'one_day', 'same_day'] as const

/** Global default reminder offsets. Individual events can still remove/add reminders of their own via the EventModal. */
export function ReminderSettings() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getNotificationPreferences(user.id)
      .then(setPrefs)
      .catch((err) => setError(err instanceof Error ? err.message : t('reminderSettings.loadError')))
      .finally(() => setLoading(false))
  }, [user, t])

  const toggle = async (key: (typeof OPTION_KEYS)[number]) => {
    if (!user || !prefs) return
    const next = { [key]: !prefs[key] }
    setPrefs({ ...prefs, ...next })
    setSaving(true)
    setError(null)
    try {
      const updated = await updateNotificationPreferences(user.id, next)
      setPrefs(updated)
    } catch (err) {
      setPrefs(prefs)
      setError(err instanceof Error ? err.message : t('reminderSettings.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t('reminderSettings.loading')}</p>
  if (!prefs) return <p className="text-sm text-slate-500 dark:text-slate-400">{error ?? t('reminderSettings.unavailable')}</p>

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('reminderSettings.intro')}</p>
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {OPTION_KEYS.map((key) => (
          <label key={key} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t(`reminderSettings.options.${key}.label`)}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{t(`reminderSettings.options.${key}.hint`)}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key)}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
            />
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
