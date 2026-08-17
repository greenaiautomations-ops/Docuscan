import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { StatCard } from '../components/dashboard/StatCard'
import { RecentDocumentsList } from '../components/dashboard/RecentDocumentsList'
import { EventCard } from '../components/events/EventCard'
import { NotificationCard } from '../components/events/NotificationCard'
import { EventModal } from '../components/events/EventModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { UploadButton } from '../components/documents/UploadButton'
import { formatCurrency } from '../utils/formatters'
import { getUpcomingEvents } from '../services/eventService'
import { getPaymentTotals } from '../services/paymentService'
import { listUnifiedNotifications, markUnifiedAsRead } from '../services/notificationService'
import type { Event, UnifiedNotification } from '../types/document'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function DashboardPage() {
  const { profile } = useAuth()
  const { stats, loading, error, refresh } = useDashboardStats()

  const [upcoming, setUpcoming] = useState<Event[]>([])
  const [paymentTotals, setPaymentTotals] = useState<{ byCurrency: Record<string, number>; overdueCount: number } | null>(null)
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([])
  const [phase3Loading, setPhase3Loading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  useEffect(() => {
    setPhase3Loading(true)
    Promise.all([getUpcomingEvents(7), getPaymentTotals(), listUnifiedNotifications()])
      .then(([events, totals, notifs]) => {
        setUpcoming(events)
        setPaymentTotals(totals)
        setNotifications(notifs)
      })
      .catch(() => undefined)
      .finally(() => setPhase3Loading(false))
  }, [])

  const today = todayStr()
  const todaysEvents = useMemo(() => upcoming.filter((e) => e.event_date === today), [upcoming, today])
  const laterEvents = useMemo(() => upcoming.filter((e) => e.event_date !== today), [upcoming, today])
  const actionRequiredEvents = useMemo(() => upcoming.filter((e) => e.status === 'needs_review'), [upcoming])
  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read).slice(0, 5), [notifications])

  const upcomingAmountLabel = paymentTotals
    ? Object.entries(paymentTotals.byCurrency)
        .map(([currency, amount]) => formatCurrency(amount, currency === '—' ? null : currency))
        .join(' + ') || formatCurrency(0, null)
    : '—'

  const handleMarkRead = async (notification: UnifiedNotification) => {
    await markUnifiedAsRead(notification)
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
  }

  const handleEventChanged = (updatedEvent: Event | null) => {
    setUpcoming((prev) =>
      updatedEvent ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)) : prev.filter((e) => e.id !== selectedEvent?.id),
    )
    setSelectedEvent(null)
  }

  if (loading) return <LoadingSpinner fullHeight label="Loading dashboard…" />
  if (error) return <ErrorMessage message={error} onRetry={refresh} />
  if (!stats) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening with your documents.</p>
        </div>
        <UploadButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total documents" value={stats.totalDocuments} />
        <StatCard label="Today" value={todaysEvents.length} />
        <StatCard label="Action required" value={actionRequiredEvents.length + stats.actionRequiredDocuments.length} />
        <StatCard label="Upcoming payments" value={upcomingAmountLabel} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Today</h2>
          {phase3Loading ? (
            <LoadingSpinner label="Loading…" />
          ) : todaysEvents.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nothing scheduled for today.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {todaysEvents.map((event) => (
                <EventCard key={event.id} event={event} onOpen={setSelectedEvent} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Upcoming (next 7 days)</h2>
          {phase3Loading ? (
            <LoadingSpinner label="Loading…" />
          ) : laterEvents.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nothing else coming up this week.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {laterEvents.slice(0, 5).map((event) => (
                <EventCard key={event.id} event={event} onOpen={setSelectedEvent} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentDocumentsList
          title="Recent documents"
          documents={stats.recentDocuments}
          emptyText="No documents yet. Upload your first one to get started."
        />
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Action required</h2>
          {actionRequiredEvents.length === 0 && stats.actionRequiredDocuments.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Nothing needs your attention right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {actionRequiredEvents.map((event) => (
                <EventCard key={event.id} event={event} onOpen={setSelectedEvent} />
              ))}
              {stats.actionRequiredDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/15"
                >
                  {doc.title}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Notifications</h2>
          {unreadNotifications.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">You&apos;re all caught up.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {unreadNotifications.map((n) => (
                <NotificationCard key={`${n.source}-${n.id}`} notification={n} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </div>
      </div>

      <EventModal event={selectedEvent} open={!!selectedEvent} onClose={() => setSelectedEvent(null)} onChanged={handleEventChanged} />
    </div>
  )
}
