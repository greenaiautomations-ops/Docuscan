import { Link } from 'react-router-dom'
import { relativeDateLabel } from '../../utils/formatters'
import type { UnifiedNotification } from '../../types/document'

interface NotificationCardProps {
  notification: UnifiedNotification
  onMarkRead?: (notification: UnifiedNotification) => void
}

export function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const target = notification.eventId
    ? `/deadlines?event=${notification.eventId}`
    : notification.documentId
      ? `/documents/${notification.documentId}`
      : null

  const body = (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${notification.read ? 'border-slate-200 bg-white' : 'border-indigo-200 bg-indigo-50/60'}`}>
      {!notification.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${notification.read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>{notification.title}</p>
        {notification.message && <p className="mt-0.5 text-xs text-slate-500">{notification.message}</p>}
        <p className="mt-1 text-xs text-slate-400">{relativeDateLabel(notification.createdAt.slice(0, 10))}</p>
      </div>
      {!notification.read && onMarkRead && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMarkRead(notification)
          }}
          className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Mark read
        </button>
      )}
    </div>
  )

  if (!target) return body

  return (
    <Link to={target} onClick={() => !notification.read && onMarkRead?.(notification)} className="block">
      {body}
    </Link>
  )
}
