import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useEvents } from '../hooks/useEvents'
import { EventModal } from '../components/events/EventModal'
import { Modal } from '../components/common/Modal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'
import { EVENT_TYPE_COLORS, EVENT_STATUS_COMPLETED_COLOR, EVENT_TYPES } from '../utils/constants'
import { formatDateOnly, formatTimeOnly } from '../utils/formatters'
import { createEvent } from '../services/eventService'
import type { Event, EventType } from '../types/document'

type ViewMode = 'month' | 'week' | 'day' | 'agenda'

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function colorFor(event: Event) {
  if (event.status === 'completed') return EVENT_STATUS_COMPLETED_COLOR
  return EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS.other
}

function EventChip({ event, onClick }: { event: Event; onClick: () => void }) {
  const colors = colorFor(event)
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium ${colors.bg} ${colors.text}`}
      title={event.title}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />
      <span className="truncate">{event.title}</span>
    </button>
  )
}

export function CalendarPage() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [anchor, setAnchor] = useState(() => new Date())
  const [view, setView] = useState<ViewMode>('month')
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<EventType>('other')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [creatingSaving, setCreatingSaving] = useState(false)

  const { events, loading, error, refresh, setEvents } = useEvents({})
  const visibleEvents = useMemo(() => events.filter((e) => e.status !== 'dismissed'), [events])

  const weekdayLabels = useMemo(
    () =>
      // Jan 1 2023 was a Sunday — walking 7 days from there gives locale-correct
      // short weekday names (Sun/Mon/… or So/Mo/… in German) via Intl, no hardcoded list.
      Array.from({ length: 7 }, (_, i) => new Date(2023, 0, i + 1).toLocaleDateString(i18n.language, { weekday: 'short' })),
    [i18n.language],
  )

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>()
    for (const event of visibleEvents) {
      if (!event.event_date) continue
      const list = map.get(event.event_date) ?? []
      list.push(event)
      map.set(event.event_date, list)
    }
    return map
  }, [visibleEvents])

  const monthLabel = anchor.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })

  const monthCells = useMemo(() => {
    const year = anchor.getFullYear()
    const month = anchor.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (Date | null)[] = Array(firstDay).fill(null)
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day))
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [anchor])

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [anchor])

  const today = new Date()
  const todayKey = toDateKey(today)

  const navigate = (direction: 1 | -1) => {
    const next = new Date(anchor)
    if (view === 'month') next.setMonth(next.getMonth() + direction)
    else if (view === 'week') next.setDate(next.getDate() + direction * 7)
    else next.setDate(next.getDate() + direction)
    setAnchor(next)
  }

  const handleOpenNew = (dateKey?: string) => {
    setNewTitle('')
    setNewType('other')
    setNewDate(dateKey ?? toDateKey(anchor))
    setNewTime('')
    setNewLocation('')
    setCreateError(null)
    setCreating(true)
  }

  const handleCreate = async () => {
    if (!user) return
    if (!newTitle.trim()) {
      setCreateError(t('calendarPage.newEventModal.titleRequired'))
      return
    }
    setCreatingSaving(true)
    setCreateError(null)
    try {
      const created = await createEvent({
        user_id: user.id,
        type: newType,
        title: newTitle.trim(),
        event_date: newDate || null,
        event_time: newTime || null,
        location: newLocation.trim() || null,
        status: 'confirmed',
      })
      setEvents((prev) => [...prev, created])
      setCreating(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('calendarPage.newEventModal.createError'))
    } finally {
      setCreatingSaving(false)
    }
  }

  const handleEventChanged = (updated: Event | null) => {
    if (!updated) {
      setEvents((prev) => prev.filter((e) => e.id !== selectedEvent?.id))
    } else {
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    }
    setSelectedEvent(null)
  }

  const agendaEvents = useMemo(
    () =>
      [...visibleEvents]
        .filter((e) => e.event_date && e.status !== 'completed')
        .sort((a, b) => (a.event_date! < b.event_date! ? -1 : 1)),
    [visibleEvents],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('calendarPage.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('calendarPage.subtitle')}</p>
        </div>
        <button
          onClick={() => handleOpenNew()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          {t('calendarPage.newEvent')}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ←
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('calendarPage.today')}
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-2.5 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            →
          </button>
          <h2 className="ml-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            {view === 'day' ? anchor.toLocaleDateString(i18n.language, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : monthLabel}
          </h2>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
          {(['month', 'week', 'day', 'agenda'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t(`calendarPage.views.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        {EVENT_TYPES.map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${EVENT_TYPE_COLORS[type]?.dot}`} />
            {t(`eventType.${type}`)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${EVENT_STATUS_COMPLETED_COLOR.dot}`} />
          {t('calendarPage.completed')}
        </span>
      </div>

      {loading && <LoadingSpinner label={t('calendarPage.loading')} />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}

      {!loading && !error && view === 'month' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
            {weekdayLabels.map((day, i) => (
              <div key={i} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells.map((date, idx) => {
              if (!date) return <div key={idx} className="min-h-[90px]" />
              const key = toDateKey(date)
              const dayEvents = eventsByDate.get(key) ?? []
              const isToday = key === todayKey
              return (
                <div
                  key={idx}
                  className={`flex min-h-[90px] flex-col gap-1 rounded-lg border p-1.5 ${
                    isToday ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isToday ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {date.getDate()}
                    </span>
                    <button
                      onClick={() => handleOpenNew(key)}
                      className="text-xs text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400"
                      title={t('calendarPage.addEvent')}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <EventChip key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {t('calendarPage.more', { count: dayEvents.length - 3 })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && !error && view === 'week' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
          {weekDays.map((date) => {
            const key = toDateKey(date)
            const dayEvents = eventsByDate.get(key) ?? []
            const isToday = key === todayKey
            return (
              <div
                key={key}
                className={`flex flex-col gap-2 rounded-xl border p-3 ${
                  isToday ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {date.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric' })}
                  </p>
                  <button onClick={() => handleOpenNew(key)} className="text-xs text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400">
                    +
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  {dayEvents.length === 0 && <p className="text-[11px] text-slate-300 dark:text-slate-600">{t('calendarPage.noEvents')}</p>}
                  {dayEvents.map((event) => (
                    <EventChip key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && view === 'day' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          {(eventsByDate.get(toDateKey(anchor)) ?? []).length === 0 && (
            <EmptyState title={t('calendarPage.nothingScheduled.title')} description={t('calendarPage.nothingScheduled.description')} />
          )}
          <div className="flex flex-col gap-2">
            {(eventsByDate.get(toDateKey(anchor)) ?? []).map((event) => {
              const colors = colorFor(event)
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{event.title}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatTimeOnly(event.event_time) ?? t('calendarPage.allDay')}
                      {event.location ? ` · ${event.location}` : ''}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!loading && !error && view === 'agenda' && (
        <div className="flex flex-col gap-2">
          {agendaEvents.length === 0 && <EmptyState title={t('calendarPage.noUpcoming.title')} description={t('calendarPage.noUpcoming.description')} />}
          {agendaEvents.map((event) => {
            const colors = colorFor(event)
            return (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{event.title}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatDateOnly(event.event_date, t)}
                    {formatTimeOnly(event.event_time) ? ` · ${formatTimeOnly(event.event_time)}` : ''}
                    {event.location ? ` · ${event.location}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${colors.bg} ${colors.text}`}>
                  {t(`eventType.${event.type}`)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <EventModal event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} onChanged={handleEventChanged} />

      <Modal open={creating} title={t('calendarPage.newEventModal.title')} onClose={() => setCreating(false)}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('calendarPage.newEventModal.fields.title')}</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('calendarPage.newEventModal.fields.type')}</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as EventType)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`eventType.${type}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('calendarPage.newEventModal.fields.date')}</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('calendarPage.newEventModal.fields.time')}</label>
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('calendarPage.newEventModal.fields.location')}</label>
            <input
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
          <button
            onClick={handleCreate}
            disabled={creatingSaving}
            className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {creatingSaving ? t('calendarPage.newEventModal.creating') : t('calendarPage.newEventModal.submit')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
