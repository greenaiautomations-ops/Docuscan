import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EventTypeBadge, PriorityBadge } from './EventTypeBadge'
import { formatDateOnly, isDateOverdue, relativeDateLabel } from '../../utils/formatters'
import type { Event } from '../../types/document'

interface DeadlineCardProps {
  event: Event
  onComplete: (event: Event) => void
  onEdit: (event: Event) => void
  onSnooze: (event: Event) => void
}

export function DeadlineCard({ event, onComplete, onEdit, onSnooze }: DeadlineCardProps) {
  const { t } = useTranslation()
  const isOverdue = isDateOverdue(event.event_date)

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{event.title}</p>
        <PriorityBadge priority={event.priority} />
      </div>

      {event.description && <p className="text-sm text-slate-500 dark:text-slate-400">{event.description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge type={event.type} status={event.status} />
        <span className={`text-xs font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {event.event_date ? `${relativeDateLabel(event.event_date, t)} · ${formatDateOnly(event.event_date, t)}` : t('dateLabels.noDateSet')}
        </span>
        {event.status === 'needs_review' && (
          <span className="rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            {t('components.pleaseVerify')}
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
        {event.status !== 'completed' && (
          <button onClick={() => onComplete(event)} className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400">
            {t('components.complete')}
          </button>
        )}
        <button onClick={() => onEdit(event)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
          {t('common.edit')}
        </button>
        {event.status !== 'completed' && (
          <button onClick={() => onSnooze(event)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            {t('components.snooze')}
          </button>
        )}
        {event.document_id && (
          <Link to={`/documents/${event.document_id}`} className="ml-auto text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            {t('components.openDocument')}
          </Link>
        )}
      </div>
    </div>
  )
}
