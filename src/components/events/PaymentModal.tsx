import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const parsedAmount = amount.trim() ? Number(amount) : null
    if (amount.trim() && Number.isNaN(parsedAmount)) {
      setError('Amount must be a number.')
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
      setError(err instanceof Error ? err.message : 'Could not delete this payment.')
    } finally {
      setSaving(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <Modal open={open} title="Payment" onClose={onClose}>
        <div className="flex flex-col gap-4">
          {payment.status === 'unknown' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This payment's status couldn't be determined automatically — please review and confirm the details below.
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Recipient</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Currency</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Reference number</label>
            <input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="payment-recurring"
              type="checkbox"
              checked={recurring}
              onChange={(e) => setRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="payment-recurring" className="text-sm text-slate-700">
              This is a recurring payment
            </label>
          </div>

          {recurring && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Recurrence</label>
              <select
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(e.target.value as RecurrenceInterval)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select interval…</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">
                Confirming a recurrence here does not create future payments automatically — each one is created as its own document is processed.
              </p>
            </div>
          )}

          {payment.document_id && (
            <Link to={`/documents/${payment.document_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Open source document
            </Link>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-2">
              {payment.status === 'pending' && (
                <button
                  onClick={() => runAction(() => markPaymentPaid(payment.id))}
                  disabled={saving}
                  className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                >
                  Mark paid
                </button>
              )}
              {payment.status !== 'cancelled' && (
                <button
                  onClick={() => runAction(() => ignorePayment(payment.id))}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Ignore
                </button>
              )}
              <button
                onClick={() => setDeleteOpen(true)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete payment"
        message={`Delete this payment${payment.recipient ? ` to ${payment.recipient}` : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
