import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Document } from '../../types/document'
import { StatusBadge } from '../common/Badge'
import { formatRelativeTime } from '../../utils/formatters'

interface RecentDocumentsListProps {
  title: string
  documents: Document[]
  emptyText: string
}

export function RecentDocumentsList({ title, documents, emptyText }: RecentDocumentsListProps) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h2>
      {documents.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3">
              <Link
                to={`/documents/${doc.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {doc.title}
              </Link>
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                {formatRelativeTime(doc.created_at, t)}
              </span>
              <StatusBadge status={doc.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
