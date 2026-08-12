import { useMemo, useState } from 'react'
import { useUnifiedNotifications } from '../hooks/useUnifiedNotifications'
import { NotificationCard } from '../components/events/NotificationCard'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'

const TABS: { key: 'all' | 'unread' | 'read'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
]

export function NotificationsPage() {
  const { notifications, loading, error, refresh, markRead, markAllRead, remove } = useUnifiedNotifications()
  const [tab, setTab] = useState<'all' | 'unread' | 'read'>('all')

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])
  const visible = useMemo(() => {
    if (tab === 'unread') return notifications.filter((n) => !n.read)
    if (tab === 'read') return notifications.filter((n) => n.read)
    return notifications
  }, [notifications, tab])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Reminders and updates about your documents, deadlines, and payments.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 self-start">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="Loading notifications…" />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState title="No notifications" description="You'll see reminders and document activity here." />
      )}
      {!loading && !error && visible.length > 0 && (
        <ul className="flex flex-col gap-2">
          {visible.map((n) => (
            <li key={`${n.source}-${n.id}`} className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <NotificationCard notification={n} onMarkRead={markRead} />
              </div>
              <button
                onClick={() => remove(n)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
