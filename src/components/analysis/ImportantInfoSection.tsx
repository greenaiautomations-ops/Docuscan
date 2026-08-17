import { useTranslation } from 'react-i18next'
import { ExtractedFieldRow, ExtractedListField } from './ExtractedFieldRow'
import type { ExtractedData } from '../../types/document'

export function ImportantInfoSection({ data }: { data: ExtractedData }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{t('analysis.importantInfo.title')}</h2>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        <ExtractedFieldRow label={t('analysis.importantInfo.documentTitle')} field={data.document_title} />
        <ExtractedFieldRow label={t('analysis.importantInfo.issuer')} field={data.issuer} />
        <ExtractedFieldRow label={t('analysis.importantInfo.recipient')} field={data.recipient} />
        <ExtractedListField label={t('analysis.importantInfo.names')} items={data.names} />
        <ExtractedListField label={t('analysis.importantInfo.organizations')} items={data.organizations} />
        <ExtractedListField label={t('analysis.importantInfo.addresses')} items={data.addresses} />
        <ExtractedFieldRow label={t('analysis.importantInfo.referenceNumber')} field={data.reference_number} />
        <ExtractedFieldRow label={t('analysis.importantInfo.invoiceNumber')} field={data.invoice_number} />
        <ExtractedFieldRow label={t('analysis.importantInfo.contractNumber')} field={data.contract_number} />
        <ExtractedFieldRow label={t('analysis.importantInfo.customerNumber')} field={data.customer_number} />
        <ExtractedFieldRow label={t('analysis.importantInfo.phone')} field={data.phone} />
        <ExtractedFieldRow label={t('analysis.importantInfo.email')} field={data.email} />
        <ExtractedFieldRow label={t('analysis.importantInfo.iban')} field={data.iban} />
      </div>
    </div>
  )
}
