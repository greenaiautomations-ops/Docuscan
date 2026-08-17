import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { deletePayment, ignorePayment, markPaymentPaid, updatePayment } from '../../services/paymentService'
import type { Payment, RecurrenceInterval } from '../../types/document'

interface PaymentModalProps {
  payment: Payment | null
  open: boolean
  onClose: () => void
  onChanged: (updated: Payment | null) => void
}

export function PaymentModal({ payment, open, onClose, onChanged }: PaymentModalProps) {
  const { t } = useTranslation()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [recurrenceInterval, setRecurrenceInterval] = useState<RecurrenceInterval | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!payment) return
    setRecipient(payment.recipient ?? '')
    setAmount(payment.amount != null ? String(payment.amount) : '')
    setCurrency(payment.currency ?? '')
    setDueDate(payment.due_date ?? '')
    setReferenceNumber(payment.reference_number ?? '')
    setRecurring(payment.recurring)
    setRecurrenceInterval((payment.recurrence_interval as RecurrenceInterval) ?? '')
    setError(null)
  }, [payment])

  if (!payment) return null

  const runAction = async (action: () => Promise<Payment>) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await action()
      onChanged(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('paymentModal.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const parsedAmount = amount.trim() ? Number(amount) : null
    if (amount.trim() && Number.isNaN(parsedAmount)) {
      setError(t('paymentModal.errors.invalidAmount'))
      return
    }
    await runAction(() =>
      updatePayment(payment.id, {
        recipient: recipient.trim() || null,
        amount: parsedAmount,
        currency: currency.trim() || null,
        due_date: dueDate || null,
        reference_number: referenceNumber.trim() || null,
        recurring,
        // Only ever store a recurrence interval when the user has explicitly confirmed recurrence.
        recurrence_interval: recurring && recurrenceInterval ? recurrenceInterval : null,
      }),
    )
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deletePayment(payment.id)
      onChanged(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('paymentModal.errors.deleteFailed'))
    } finally {
      setSaving(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <Modal open={open} title={t('paymentModal.title')} onClose={onClose}>
        <div className="flex flex-col gap-4">
          {payment.status === 'unknown' && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
              {t('paymentModal.unknownWarning')}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('paymentModal.fields.recipient')}</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('paymentModal.fields.amount')}</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('paymentModal.fields.currency')}</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('paymentModal.fields.dueDate')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('paymentModal.fields.referenceNumber')}</label>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="payment-recurring"
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
            />
            <label htmlFor="payment-recurring" className="text-sm text-slate-700 dark:text-slate-300">
              {t('paymentModal.recurringLabel')}
            </label>
          </div>

          {recurring && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{t('paymentModal.fields.recurrence')}</label>
              <select
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">{t('paymentModal.selectInterval')}</option>
                <option value="weekly">{t('paymentModal.intervals.weekly')}</option>
                <option value="monthly">{t('paymentModal.intervals.monthly')}</option>
                <option value="quarterly">{t('paymentModal.intervals.quarterly')}</option>
                <option value="yearly">{t('paymentModal.intervals.yearly')}</option>
              </select>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('paymentModal.recurrenceHint')}</p>
            </div>
          )}

          {payment.document_id && (
            <Link to={`/documents/${payment.document_id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
              {t('paymentModal.openSourceDocument')}
            </Link>
          )}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex flex-wrap gap-2">
              {payment.status === 'pending' && (
                <button
                  onClick={() => runAction(() => markPaymentPaid(payment.id))}
                  disabled={saving}
                  className="rounded-lg border border-emerald-300 dark:border-emerald-500/40 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-60"
                >
                  {t('paymentModal.markPaid')}
                </button>
              )}
              {payment.status !== 'cancelled' && (
                <button
                  onClick={() => runAction(() => ignorePayment(payment.id))}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                >
                  {t('paymentModal.ignore')}
                </button>
              )}
              <button
                onClick={() => setDeleteOpen(true)}
                className="rounded-lg border border-red-300 dark:border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                {t('common.delete')}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? t('common.saving') : t('common.saveChanges')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title={t('paymentModal.deletePayment.title')}
        message={t('paymentModal.deletePayment.message', {
          recipient: payment.recipient ? t('paymentModal.deletePayment.toRecipient', { name: payment.recipient }) : '',
        })}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
