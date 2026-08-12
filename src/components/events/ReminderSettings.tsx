import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getNotificationPreferences, updateNotificationPreferences } from '../../services/notificationPreferencesService'
import type { NotificationPreferences } from '../../types/document'

const OPTIONS: { key: 'seven_days' | 'three_days' | 'one_day' | 'same_day'; label: string; hint: string }[] = [
  { key: 'seven_days', label: '7 days before', hint: 'Early heads-up for deadlines and payments' },
  { key: 'three_days', label: '3 days before', hint: 'Second nudge' },
  { key: 'one_day', label: '1 day before', hint: 'Final warning' },
  { key: 'same_day', label: 'On the day', hint: 'Day-of reminder' },
]

/** Global default reminder offsets. Individual events can still remove/add reminders of their own via the EventModal. */
export function ReminderSettings() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    getNotificationPreferences(user.id)
      .then(setPrefs)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load reminder settings.'))
      .finally(() => setLoading(false))
  }, [user])

  const toggle = async (key: (typeof OPTIONS)[number]['key']) => {
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
      setError(err instanceof Error ? err.message : 'Could not save this change.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading reminder settings…</p>
  if (!prefs) return <p className="text-sm text-slate-500">{error ?? 'Reminder settings unavailable.'}</p>

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-500">
        Choose when you'd like to be reminded before upcoming deadlines, payments, and appointments.
      </p>
      <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
        {OPTIONS.map((opt) => (
          <label key={opt.key} className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{opt.label}</p>
              <p className="text-xs text-slate-400">{opt.hint}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[opt.key]}
              onChange={() => toggle(opt.key)}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
