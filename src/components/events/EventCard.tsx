import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EventTypeBadge, PriorityBadge } from './EventTypeBadge'
import { formatDateOnly, formatTimeOnly, relativeDateLabel } from '../../utils/formatters'
import type { Event } from '../../types/document'

interface EventCardProps {
  event: Event
  onOpen: (event: Event) => void
}

export function EventCard({ event, onOpen }: EventCardProps) {
  const { t } = useTranslation()
  const time = formatTimeOnly(event.event_time)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => onOpen(event)} className="text-left text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400">
          {event.title}
        </button>
        {event.status === 'needs_review' && (
          <span className="shrink-0 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            {t('components.pleaseVerify')}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge type={event.type} status={event.status} />
        <PriorityBadge priority={event.priority} />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>
          {relativeDateLabel(event.event_date, t)}
          {time ? ` · ${time}` : ''}
          {event.event_date ? ` (${formatDateOnly(event.event_date, t)})` : ''}
        </span>
      </div>

      {event.location && <p className="text-xs text-slate-500 dark:text-slate-400">📍 {event.location}</p>}

      <div className="mt-1 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
        <button onClick={() => onOpen(event)} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
          {t('components.open')}
        </button>
        {event.document_id && (
          <Link to={`/documents/${event.document_id}`} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            {t('components.sourceDocument')}
          </Link>
        )}
      </div>
    </div>
  )
}
