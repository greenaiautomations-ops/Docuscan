import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { DeadlineCard } from '../components/events/DeadlineCard'
import { EventModal } from '../components/events/EventModal'
import { Modal } from '../components/common/Modal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'
import { EVENT_TYPE_LABELS } from '../utils/constants'
import { completeEvent, snoozeEvent, type EventFilters } from '../services/eventService'
import type { Event } from '../types/document'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function bucketOf(event: Event): 'overdue' | 'today' | 'week' | 'upcoming' | 'completed' | 'undated' {
  if (event.status === 'completed') return 'completed'
  if (!event.event_date) return 'undated'
  const today = todayStr()
  const weekEnd = addDays(today, 7)
  if (event.event_date < today) return 'overdue'
  if (event.event_date === today) return 'today'
  if (event.event_date <= weekEnd) return 'week'
  return 'upcoming'
}

const SECTIONS: { key: string; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'undated', label: 'No date set' },
  { key: 'completed', label: 'Completed' },
]

export function DeadlinesPage() {
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('all')
  const [type, setType] = useState('all')
  const [editing, setEditing] = useState<Event | null>(null)
  const [snoozing, setSnoozing] = useState<Event | null>(null)
  const [snoozeDate, setSnoozeDate] = useState('')

  const filters: EventFilters = useMemo(() => ({ search, priority, type }), [search, priority, type])
  const { events, loading, error, refresh, setEvents } = useEvents(filters)
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep-link support: notifications link here with ?event=<id> to open that event's details directly.
  useEffect(() => {
    const eventId = searchParams.get('event')
    if (!eventId || loading) return
    const match = events.find((e) => e.id === eventId)
    if (match) {
      setEditing(match)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('event')
        return next
      })
    }
  }, [searchParams, events, loading, setSearchParams])

  const grouped = useMemo(() => {
    const buckets: Record<string, Event[]> = {
      overdue: [],
      today: [],
      week: [],
      upcoming: [],
      undated: [],
      completed: [],
    }
    for (const e of events) buckets[bucketOf(e)].push(e)
    return buckets
  }, [events])

  const handleComplete = async (event: Event) => {
    const updated = await completeEvent(event.id)
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  const openSnooze = (event: Event) => {
    setSnoozing(event)
    setSnoozeDate(event.event_date ?? todayStr())
  }

  const applySnooze = async (newDate: string) => {
    if (!snoozing) return
    const updated = await snoozeEvent(snoozing.id, newDate)
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setSnoozing(null)
  }

  const handleEventChanged = (updated: Event | null) => {
    if (!updated) {
      setEvents((prev) => prev.filter((e) => e.id !== editing?.id))
    } else {
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    }
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Deadlines</h1>
        <p className="text-sm text-slate-500">Tasks and deadlines detected from your documents.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deadlines…"
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All types</option>
          {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingSpinner label="Loading deadlines…" />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}

      {!loading && !error && events.length === 0 && (
        <EmptyState title="No deadlines yet" description="Deadlines and tasks detected from your documents will show up here." />
      )}

      {!loading && !error && events.length > 0 && (
        <div className="flex flex-col gap-8">
          {SECTIONS.map(({ key, label }) =>
            grouped[key].length > 0 ? (
              <div key={key} className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {label} <span className="text-slate-300">({grouped[key].length})</span>
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[key].map((event) => (
                    <DeadlineCard
                      key={event.id}
                      event={event}
                      onComplete={handleComplete}
                      onEdit={setEditing}
                      onSnooze={openSnooze}
                    />
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      <EventModal event={editing} open={!!editing} onClose={() => setEditing(null)} onChanged={handleEventChanged} />

      <Modal open={!!snoozing} title="Snooze deadline" onClose={() => setSnoozing(null)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">Push "{snoozing?.title}" to a new date.</p>
          <div className="flex flex-wrap gap-2">
            {[1, 3, 7].map((days) => (
              <button
                key={days}
                onClick={() => applySnooze(addDays(todayStr(), days))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                +{days} day{days > 1 ? 's' : ''}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Or pick a date</label>
            <input
              type="date"
              value={snoozeDate}
              onChange={(e) => setSnoozeDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={() => applySnooze(snoozeDate)}
            disabled={!snoozeDate}
            className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Snooze
          </button>
        </div>
      </Modal>
    </div>
  )
}
