import type { DocumentImportance, DocumentStatus } from '../../types/document'

const STATUS_STYLES: Record<DocumentStatus, string> = {
  uploading: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

const IMPORTANCE_STYLES: Record<DocumentImportance, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-slate-100 text-slate-600',
  high: 'bg-orange-100 text-orange-700',
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  )
}

export function ImportanceBadge({ importance }: { importance: DocumentImportance }) {
  if (importance === 'normal') return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${IMPORTANCE_STYLES[importance]}`}
    >
      {importance}
    </span>
  )
}
