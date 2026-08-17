import { useTranslation } from 'react-i18next'
import type { DocumentImportance, DocumentStatus } from '../../types/document'

const STATUS_STYLES: Record<DocumentStatus, string> = {
  uploading: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  uploaded: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  processing: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  analyzed: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  completed: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  failed: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
}

const IMPORTANCE_STYLES: Record<DocumentImportance, string> = {
  low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  normal: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  high: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation()
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}
    >
      {t(`documentStatus.${status}`, { defaultValue: status })}
    </span>
  )
}

export function ImportanceBadge({ importance }: { importance: DocumentImportance }) {
  const { t } = useTranslation()
  if (importance === 'normal') return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${IMPORTANCE_STYLES[importance]}`}
    >
      {t(`documentImportance.${importance}`, { defaultValue: importance })}
    </span>
  )
}
