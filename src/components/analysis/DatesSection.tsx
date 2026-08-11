import { ExtractedFieldRow } from './ExtractedFieldRow'
import type { ExtractedData } from '../../types/document'

export function DatesSection({ data }: { data: ExtractedData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Dates</h2>
      <div className="divide-y divide-slate-100">
        <ExtractedFieldRow label="Document date" field={data.document_date} />
        <ExtractedFieldRow label="Effective date" field={data.effective_date} />
        <ExtractedFieldRow label="Expiry date" field={data.expiry_date} />
        <ExtractedFieldRow label="Deadline" field={data.deadline} />
        <ExtractedFieldRow label="Appointment date/time" field={data.appointment_datetime} />
      </div>
    </div>
  )
}
