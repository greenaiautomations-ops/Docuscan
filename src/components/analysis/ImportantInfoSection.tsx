import { ExtractedFieldRow, ExtractedListField } from './ExtractedFieldRow'
import type { ExtractedData } from '../../types/document'

export function ImportantInfoSection({ data }: { data: ExtractedData }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Important Information</h2>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        <ExtractedFieldRow label="Document title" field={data.document_title} />
        <ExtractedFieldRow label="Issuer" field={data.issuer} />
        <ExtractedFieldRow label="Recipient" field={data.recipient} />
        <ExtractedListField label="Names" items={data.names} />
        <ExtractedListField label="Organizations" items={data.organizations} />
        <ExtractedListField label="Addresses" items={data.addresses} />
        <ExtractedFieldRow label="Reference number" field={data.reference_number} />
        <ExtractedFieldRow label="Invoice number" field={data.invoice_number} />
        <ExtractedFieldRow label="Contract number" field={data.contract_number} />
        <ExtractedFieldRow label="Customer number" field={data.customer_number} />
        <ExtractedFieldRow label="Phone" field={data.phone} />
        <ExtractedFieldRow label="Email" field={data.email} />
        <ExtractedFieldRow label="IBAN" field={data.iban} />
      </div>
    </div>
  )
}
