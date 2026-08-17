import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUnifiedNotifications } from '../hooks/useUnifiedNotifications'
import { NotificationCard } from '../components/events/NotificationCard'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'

const TAB_KEYS: ('all' | 'unread' | 'read')[] = ['all', 'unread', 'read']

export function NotificationsPage() {
  const { t } = useTranslation()
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('notificationsPage.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('notificationsPage.subtitle')}</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('notificationsPage.markAllRead')}
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1 self-start">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t(`notificationsPage.tabs.${key}`)}
            {key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label={t('notificationsPage.loading')} />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState title={t('notificationsPage.empty.title')} description={t('notificationsPage.empty.description')} />
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
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
              >
                {t('notificationsPage.delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
