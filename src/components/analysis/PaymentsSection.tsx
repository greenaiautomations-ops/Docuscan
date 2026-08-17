import { useTranslation } from 'react-i18next'
import { ExtractedFieldRow } from './ExtractedFieldRow'
import type { ExtractedData } from '../../types/document'

export function PaymentsSection({ data }: { data: ExtractedData }) {
  const { t } = useTranslation()
  const hasPaymentInfo = data.payment_amount || data.currency || data.payment_due_date

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('analysis.payments.title')}</h2>
      {!hasPaymentInfo && <p className="text-xs text-slate-400 dark:text-slate-500">{t('analysis.payments.noPaymentInfo')}</p>}
      {hasPaymentInfo && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <ExtractedFieldRow label={t('analysis.payments.amount')} field={data.payment_amount} />
          <ExtractedFieldRow label={t('analysis.payments.currency')} field={data.currency} />
          <ExtractedFieldRow label={t('analysis.payments.paymentDueDate')} field={data.payment_due_date} />
        </div>
      )}
    </div>
  )
}
