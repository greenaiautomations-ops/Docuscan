import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatDateOnly, relativeDateLabel } from '../../utils/formatters'
import { PAYMENT_STATUS_STYLES } from '../../utils/constants'
import type { Payment } from '../../types/document'

interface PaymentCardProps {
  payment: Payment
  onOpen?: (payment: Payment) => void
  onMarkPaid?: (payment: Payment) => void
}

export function PaymentCard({ payment, onOpen, onMarkPaid }: PaymentCardProps) {
  const { t } = useTranslation()
  const isOverdue = payment.status === 'pending' && payment.due_date && payment.due_date < new Date().toISOString().slice(0, 10)
  const statusLabel = isOverdue ? 'overdue' : payment.status

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <button
            onClick={() => onOpen?.(payment)}
            className="text-left text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {payment.recipient || t('components.unknownRecipient')}
          </button>
          {payment.reference_number && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('components.ref', { value: payment.reference_number })}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            PAYMENT_STATUS_STYLES[isOverdue ? 'overdue' : payment.status] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          {t(`paymentStatus.${statusLabel}`, { defaultValue: statusLabel })}
        </span>
      </div>

      <div className="flex items-end justify-between">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {payment.amount != null ? formatCurrency(payment.amount, payment.currency) : t('components.amountUnknown')}
        </p>
        {payment.due_date && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('components.due', { date: relativeDateLabel(payment.due_date, t) })}
            <span className="ml-1 text-slate-400 dark:text-slate-500">({formatDateOnly(payment.due_date, t)})</span>
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-2">
        {payment.document_id ? (
          <Link to={`/documents/${payment.document_id}`} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
            {t('components.sourceDocument')}
          </Link>
        ) : (
          <span />
        )}
        {payment.status === 'pending' && onMarkPaid && (
          <button
            onClick={() => onMarkPaid(payment)}
            className="rounded-lg border border-emerald-300 dark:border-emerald-500/40 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
          >
            {t('components.markPaid')}
          </button>
        )}
      </div>
    </div>
  )
}
