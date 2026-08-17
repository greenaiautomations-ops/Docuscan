import { formatConfidence } from '../../utils/formatters'
import type { ExtractedField } from '../../types/document'

interface ExtractedFieldRowProps {
  label: string
  field: ExtractedField | null | undefined
}

export function ExtractedFieldRow({ label, field }: ExtractedFieldRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      {field ? (
        <span className="text-right text-slate-700 dark:text-slate-300">
          {field.value}
          <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500">({formatConfidence(field.confidence)})</span>
        </span>
      ) : (
        <span className="text-right text-xs text-slate-300 dark:text-slate-600">Not found</span>
      )}
    </div>
  )
}

export function ExtractedListField({
  label,
  items,
}: {
  label: string
  items: ExtractedField[] | undefined
}) {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
        <span className="text-slate-400 dark:text-slate-500">{label}</span>
        <span className="text-right text-xs text-slate-300 dark:text-slate-600">Not found</span>
      </div>
    )
  }
  return (
    <div className="py-1.5 text-sm">
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
      <ul className="mt-1 flex flex-col gap-1">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-center justify-between gap-3 text-slate-700 dark:text-slate-300">
            <span>{item.value}</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">({formatConfidence(item.confidence)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
