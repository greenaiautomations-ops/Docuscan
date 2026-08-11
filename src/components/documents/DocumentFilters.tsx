import { DOCUMENT_CATEGORIES } from '../../types/document'
import { titleCase } from '../../utils/formatters'

interface DocumentFiltersProps {
  category: string
  status: string
  importantOnly: boolean
  archived: boolean
  onCategoryChange: (value: string) => void
  onStatusChange: (value: string) => void
  onImportantOnlyChange: (value: boolean) => void
  onArchivedChange: (value: boolean) => void
}

const STATUSES = ['all', 'uploading', 'processing', 'completed', 'failed']

export function DocumentFilters({
  category,
  status,
  importantOnly,
  archived,
  onCategoryChange,
  onStatusChange,
  onImportantOnlyChange,
  onArchivedChange,
}: DocumentFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="all">All categories</option>
        {DOCUMENT_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {titleCase(c)}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === 'all' ? 'All statuses' : titleCase(s)}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={importantOnly}
          onChange={(e) => onImportantOnlyChange(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Important only
      </label>

      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={archived}
          onChange={(e) => onArchivedChange(e.target.checked)}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        Show archived
      </label>
    </div>
  )
}
