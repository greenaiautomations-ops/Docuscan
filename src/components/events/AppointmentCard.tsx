import { Link } from 'react-router-dom'
import { formatDateOnly, formatTimeOnly } from '../../utils/formatters'
import type { Event } from '../../types/document'

export function AppointmentCard({ event, onOpen }: { event: Event; onOpen?: (event: Event) => void }) {
  const time = formatTimeOnly(event.event_time)
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
      <button
        onClick={() => onOpen?.(event)}
        className="text-left text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
      >
        {event.title}
      </button>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        {event.event_date ? formatDateOnly(event.event_date) : 'No date'}
        {time ? ` at ${time}` : ''}
        {event.location ? ` — ${event.location}` : ''}
      </p>
      {event.document_id && (
        <Link to={`/documents/${event.document_id}`} className="mt-1 inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
          Source document
        </Link>
      )}
    </div>
  )
}
