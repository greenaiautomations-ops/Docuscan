import { Link } from 'react-router-dom'
import type { Document, Folder } from '../../types/document'
import { StatusBadge, ImportanceBadge } from '../common/Badge'
import { formatDate, formatFileSize, titleCase } from '../../utils/formatters'
import { FOLDER_COLOR_STYLES } from '../../utils/constants'

interface DocumentCardProps {
  document: Document
  folders: Folder[]
  onRename: (doc: Document) => void
  onDelete: (doc: Document) => void
  onToggleArchive: (doc: Document) => void
  onToggleImportant: (doc: Document) => void
  onMoveToFolder: (doc: Document, folderId: string | null) => void
}

export function DocumentCard({
  document,
  folders,
  onRename,
  onDelete,
  onToggleArchive,
  onToggleImportant,
  onMoveToFolder,
}: DocumentCardProps) {
  const folder = folders.find((f) => f.id === document.folder_id) ?? null
  const folderStyles = folder ? FOLDER_COLOR_STYLES[folder.color] ?? FOLDER_COLOR_STYLES.slate : null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/documents/${document.id}`}
          className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-indigo-600"
        >
          {document.title}
        </Link>
        <button
          onClick={() => onToggleImportant(document)}
          title={document.is_important ? 'Unmark important' : 'Mark important'}
          className={`shrink-0 text-lg leading-none ${
            document.is_important ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
          }`}
        >
          ★
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={document.status} />
        <ImportanceBadge importance={document.importance} />
        <span className="text-xs text-slate-400">{titleCase(document.category)}</span>
      </div>

      {folder && folderStyles && (
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${folderStyles.bg} ${folderStyles.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${folderStyles.dot}`} />
          {folder.name}
        </span>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{formatDate(document.created_at)}</span>
        <span>{formatFileSize(document.file_size)}</span>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-400">Folder</label>
        <select
          value={document.folder_id ?? ''}
          onChange={(e) => onMoveToFolder(document, e.target.value || null)}
          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs">
        <Link to={`/documents/${document.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
          Open
        </Link>
        <button onClick={() => onRename(document)} className="text-slate-500 hover:text-slate-700">
          Rename
        </button>
        <button onClick={() => onToggleArchive(document)} className="text-slate-500 hover:text-slate-700">
          {document.is_archived ? 'Unarchive' : 'Archive'}
        </button>
        <button onClick={() => onDelete(document)} className="ml-auto text-red-500 hover:text-red-700">
          Delete
        </button>
      </div>
    </div>
  )
}
