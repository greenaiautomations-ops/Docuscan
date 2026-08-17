import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePayments } from '../hooks/usePayments'
import { PaymentCard } from '../components/events/PaymentCard'
import { PaymentModal } from '../components/events/PaymentModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'
import { formatCurrency } from '../utils/formatters'
import { getPaymentTotals, markPaymentPaid, type PaymentFilters } from '../services/paymentService'
import type { Payment } from '../types/document'

const STATUS_TAB_KEYS = ['all', 'upcoming', 'overdue', 'paid', 'unknown'] as const

function bucketOf(payment: Payment): 'upcoming' | 'overdue' | 'paid' | 'unknown' {
  if (payment.status === 'paid') return 'paid'
  if (payment.status === 'unknown' || payment.status === 'disputed') return 'unknown'
  const today = new Date().toISOString().slice(0, 10)
  if (payment.status === 'pending' && payment.due_date && payment.due_date < today) return 'overdue'
  return 'upcoming'
}

export function PaymentsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [selected, setSelected] = useState<Payment | null>(null)
  const [totals, setTotals] = useState<{ byCurrency: Record<string, number>; overdueCount: number } | null>(null)

  const filters: PaymentFilters = useMemo(() => ({ search }), [search])
  const { payments, loading, error, refresh, setPayments } = usePayments(filters)

  useEffect(() => {
    getPaymentTotals().then(setTotals).catch(() => undefined)
  }, [payments])

  const grouped = useMemo(() => {
    const buckets: Record<string, Payment[]> = { upcoming: [], overdue: [], paid: [], unknown: [] }
    for (const p of payments) buckets[bucketOf(p)].push(p)
    return buckets
  }, [payments])

  const visible = tab === 'all' ? payments : grouped[tab] ?? []

  const handleMarkPaid = async (payment: Payment) => {
    const updated = await markPaymentPaid(payment.id)
    setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handleChanged = (updated: Payment | null) => {
    if (!updated) {
      setPayments((prev) => prev.filter((p) => p.id !== selected?.id))
    } else {
      setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    }
    setSelected(null)
  }

  const upcomingTotalLabel = totals
    ? Object.entries(totals.byCurrency)
        .map(([currency, amount]) => formatCurrency(amount, currency === '—' ? null : currency))
        .join(' + ') || formatCurrency(0, null)
    : '—'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('paymentsPage.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('paymentsPage.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('paymentsPage.stats.totalUpcoming')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{upcomingTotalLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('paymentsPage.stats.overdue')}</p>
          <p className="mt-1 text-lg font-semibold text-red-600 dark:text-red-400">{totals?.overdueCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('paymentsPage.stats.upcoming')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{grouped.upcoming.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('paymentsPage.stats.paid')}</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{grouped.paid.length}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('paymentsPage.searchPlaceholder')}
          className="w-full max-w-sm rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
          {STATUS_TAB_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === key ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t(`paymentsPage.tabs.${key}`)}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingSpinner label={t('paymentsPage.loading')} />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState title={t('paymentsPage.empty.title')} description={t('paymentsPage.empty.description')} />
      )}
      {!loading && !error && visible.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} onOpen={setSelected} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}

      <PaymentModal payment={selected} open={!!selected} onClose={() => setSelected(null)} onChanged={handleChanged} />
    </div>
  )
}
