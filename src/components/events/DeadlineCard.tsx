import { Link } from 'react-router-dom'
import { EventTypeBadge, PriorityBadge } from './EventTypeBadge'
import { formatDateOnly, relativeDateLabel } from '../../utils/formatters'
import type { Event } from '../../types/document'

interface DeadlineCardProps {
  event: Event
  onComplete: (event: Event) => void
  onEdit: (event: Event) => void
  onSnooze: (event: Event) => void
}

export function DeadlineCard({ event, onComplete, onEdit, onSnooze }: DeadlineCardProps) {
  const isOverdue = event.event_date ? relativeDateLabel(event.event_date).includes('overdue') : false

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{event.title}</p>
        <PriorityBadge priority={event.priority} />
      </div>

      {event.description && <p className="text-sm text-slate-500">{event.description}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge type={event.type} status={event.status} />
        <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>
          {event.event_date ? `${relativeDateLabel(event.event_date)} · ${formatDateOnly(event.event_date)}` : 'No date set'}
        </span>
        {event.status === 'needs_review' && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Please verify
          </span>
        )}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2 text-xs">
        {event.status !== 'completed' && (
          <button onClick={() => onComplete(event)} className="font-medium text-emerald-600 hover:text-emerald-700">
            Complete
          </button>
        )}
        <button onClick={() => onEdit(event)} className="text-slate-500 hover:text-slate-700">
          Edit
        </button>
        {event.status !== 'completed' && (
          <button onClick={() => onSnooze(event)} className="text-slate-500 hover:text-slate-700">
            Snooze
          </button>
        )}
        {event.document_id && (
          <Link to={`/documents/${event.document_id}`} className="ml-auto text-slate-500 hover:text-slate-700">
            Open Document
          </Link>
        )}
      </div>
    </div>
  )
}
