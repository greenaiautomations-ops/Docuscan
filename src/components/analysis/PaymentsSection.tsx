import { ExtractedFieldRow } from './ExtractedFieldRow'
import type { ExtractedData } from '../../types/document'

export function PaymentsSection({ data }: { data: ExtractedData }) {
  const hasPaymentInfo = data.payment_amount || data.currency || data.payment_due_date

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Payments</h2>
      {!hasPaymentInfo && <p className="text-xs text-slate-400">No payment information found.</p>}
      {hasPaymentInfo && (
        <div className="divide-y divide-slate-100">
          <ExtractedFieldRow label="Amount" field={data.payment_amount} />
          <ExtractedFieldRow label="Currency" field={data.currency} />
          <ExtractedFieldRow label="Payment due date" field={data.payment_due_date} />
        </div>
      )}
    </div>
  )
}
