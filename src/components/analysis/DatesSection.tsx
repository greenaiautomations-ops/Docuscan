import { useTranslation } from 'react-i18next'
import { ExtractedFieldRow } from './ExtractedFieldRow'
import type { ExtractedData } from '../../types/document'

export function DatesSection({ data }: { data: ExtractedData }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('analysis.dates.title')}</h2>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        <ExtractedFieldRow label={t('analysis.dates.documentDate')} field={data.document_date} />
        <ExtractedFieldRow label={t('analysis.dates.effectiveDate')} field={data.effective_date} />
        <ExtractedFieldRow label={t('analysis.dates.expiryDate')} field={data.expiry_date} />
        <ExtractedFieldRow label={t('analysis.dates.deadline')} field={data.deadline} />
        <ExtractedFieldRow label={t('analysis.dates.appointmentDatetime')} field={data.appointment_datetime} />
      </div>
    </div>
  )
}
