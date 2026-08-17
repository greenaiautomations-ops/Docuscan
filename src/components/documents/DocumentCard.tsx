import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Document, Folder } from '../../types/document'
import { StatusBadge, ImportanceBadge } from '../common/Badge'
import { formatDate, formatFileSize } from '../../utils/formatters'
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
  const { t } = useTranslation()
  const folder = folders.find((f) => f.id === document.folder_id) ?? null
  const folderStyles = folder ? FOLDER_COLOR_STYLES[folder.color] ?? FOLDER_COLOR_STYLES.slate : null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/documents/${document.id}`}
          className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {document.title}
        </Link>
        <button
          onClick={() => onToggleImportant(document)}
          title={document.is_important ? t('documentCard.unmarkImportant') : t('documentCard.markImportant')}
          className={`shrink-0 text-lg leading-none ${
            document.is_important ? 'text-amber-500 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
          }`}
        >
          ★
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={document.status} />
        <ImportanceBadge importance={document.importance} />
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {t(`documentCategory.${document.category}`, { defaultValue: document.category })}
        </span>
      </div>

      {folder && folderStyles && (
        <span
          className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${folderStyles.bg} ${folderStyles.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${folderStyles.dot}`} />
          {folder.name}
        </span>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>{formatDate(document.created_at)}</span>
        <span>{formatFileSize(document.file_size)}</span>
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-medium text-slate-400 dark:text-slate-500">{t('documentCard.folderLabel')}</label>
        <select
          value={document.folder_id ?? ''}
          onChange={(e) => onMoveToFolder(document, e.target.value || null)}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">{t('documentCard.noFolder')}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
        <Link to={`/documents/${document.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
          {t('documentCard.open')}
        </Link>
        <button onClick={() => onRename(document)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
          {t('documentCard.rename')}
        </button>
        <button onClick={() => onToggleArchive(document)} className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
          {document.is_archived ? t('documentCard.unarchive') : t('documentCard.archive')}
        </button>
        <button onClick={() => onDelete(document)} className="ml-auto text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-400">
          {t('common.delete')}
        </button>
      </div>
    </div>
  )
}
