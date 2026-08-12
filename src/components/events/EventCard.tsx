import { Link } from 'react-router-dom'
import { EventTypeBadge, PriorityBadge } from './EventTypeBadge'
import { formatDateOnly, formatTimeOnly, relativeDateLabel } from '../../utils/formatters'
import type { Event } from '../../types/document'

interface EventCardProps {
  event: Event
  onOpen: (event: Event) => void
}

export function EventCard({ event, onOpen }: EventCardProps) {
  const time = formatTimeOnly(event.event_time)
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => onOpen(event)} className="text-left text-sm font-semibold text-slate-900 hover:text-indigo-600">
          {event.title}
        </button>
        {event.status === 'needs_review' && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            Please verify
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <EventTypeBadge type={event.type} status={event.status} />
        <PriorityBadge priority={event.priority} />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {relativeDateLabel(event.event_date)}
          {time ? ` · ${time}` : ''}
          {event.event_date ? ` (${formatDateOnly(event.event_date)})` : ''}
        </span>
      </div>

      {event.location && <p className="text-xs text-slate-500">📍 {event.location}</p>}

      <div className="mt-1 flex items-center gap-3 border-t border-slate-100 pt-2 text-xs">
        <button onClick={() => onOpen(event)} className="font-medium text-indigo-600 hover:text-indigo-700">
          Open
        </button>
        {event.document_id && (
          <Link to={`/documents/${event.document_id}`} className="text-slate-500 hover:text-slate-700">
            Source document
          </Link>
        )}
      </div>
    </div>
  )
}
