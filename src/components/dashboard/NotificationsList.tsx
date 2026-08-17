import type { Notification } from '../../types/document'
import { formatRelativeTime } from '../../utils/formatters'

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent notifications</h2>
      {notifications.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">You&apos;re all caught up.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => (
            <li key={n.id} className={`text-sm ${n.read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{n.title}</span>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {formatRelativeTime(n.created_at)}
                </span>
              </div>
              {n.message && <p className="text-xs text-slate-400 dark:text-slate-500">{n.message}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
