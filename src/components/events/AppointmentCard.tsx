import { Link } from 'react-router-dom'
import { formatDateOnly, formatTimeOnly } from '../../utils/formatters'
import type { Event } from '../../types/document'

export function AppointmentCard({ event, onOpen }: { event: Event; onOpen?: (event: Event) => void }) {
  const time = formatTimeOnly(event.event_time)
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <button
        onClick={() => onOpen?.(event)}
        className="text-left text-sm font-medium text-slate-800 hover:text-indigo-600"
      >
        {event.title}
      </button>
      <p className="mt-0.5 text-xs text-slate-500">
        {event.event_date ? formatDateOnly(event.event_date) : 'No date'}
        {time ? ` at ${time}` : ''}
        {event.location ? ` — ${event.location}` : ''}
      </p>
      {event.document_id && (
        <Link to={`/documents/${event.document_id}`} className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-700">
          Source document
        </Link>
      )}
    </div>
  )
}
