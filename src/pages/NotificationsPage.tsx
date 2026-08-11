import { useNotifications } from '../hooks/useNotifications'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'
import { formatDateTime } from '../utils/formatters'
import { deleteNotification } from '../services/notificationService'

export function NotificationsPage() {
  const { notifications, loading, error, refresh, markRead, markAllRead } = useNotifications()

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
    refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Stay on top of document activity.</p>
        </div>
        {notifications.some((n) => !n.read) && (
          <button
            onClick={markAllRead}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading && <LoadingSpinner label="Loading notifications…" />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && notifications.length === 0 && (
        <EmptyState title="No notifications yet" description="You'll see document activity here." />
      )}
      {!loading && !error && notifications.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                n.read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
                </div>
                {n.message && <p className="mt-0.5 text-sm text-slate-500">{n.message}</p>}
                <p className="mt-1 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-xs">
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="font-medium text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
