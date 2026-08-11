import { Link } from 'react-router-dom'
import type { Document } from '../../types/document'
import { StatusBadge } from '../common/Badge'
import { formatRelativeTime } from '../../utils/formatters'

interface RecentDocumentsListProps {
  title: string
  documents: Document[]
  emptyText: string
}

export function RecentDocumentsList({ title, documents, emptyText }: RecentDocumentsListProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {documents.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3">
              <Link
                to={`/documents/${doc.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                {doc.title}
              </Link>
              <span className="shrink-0 text-xs text-slate-400">
                {formatRelativeTime(doc.created_at)}
              </span>
              <StatusBadge status={doc.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
