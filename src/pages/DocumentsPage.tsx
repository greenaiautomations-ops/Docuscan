import { useMemo, useState } from 'react'
import { useDocuments } from '../hooks/useDocuments'
import { DocumentList } from '../components/documents/DocumentList'
import { DocumentSearchBar } from '../components/documents/DocumentSearchBar'
import { DocumentFilters } from '../components/documents/DocumentFilters'
import { UploadButton } from '../components/documents/UploadButton'
import { RenameDialog } from '../components/documents/RenameDialog'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { renameDocument, setArchived, setImportant } from '../services/documentService'
import { removeDocument } from '../services/uploadService'
import type { Document } from '../types/document'

export function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [importantOnly, setImportantOnly] = useState(false)
  const [archived, setArchivedFilter] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Document | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)

  const filters = useMemo(
    () => ({ search, category, status, importantOnly, archived }),
    [search, category, status, importantOnly, archived],
  )

  const { documents, loading, error, refresh, setDocuments } = useDocuments(filters)

  const handleRename = async (title: string) => {
    if (!renameTarget) return
    const updated = await renameDocument(renameTarget.id, title)
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    setRenameTarget(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeDocument(deleteTarget)
    setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const handleToggleArchive = async (doc: Document) => {
    const updated = await setArchived(doc.id, !doc.is_archived)
    setDocuments((prev) => prev.filter((d) => d.id !== updated.id))
  }

  const handleToggleImportant = async (doc: Document) => {
    const updated = await setImportant(doc.id, !doc.is_important)
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500">Manage and organize all of your documents.</p>
        </div>
        <UploadButton />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DocumentSearchBar value={search} onChange={setSearch} />
        <DocumentFilters
          category={category}
          status={status}
          importantOnly={importantOnly}
          archived={archived}
          onCategoryChange={setCategory}
          onStatusChange={setStatus}
          onImportantOnlyChange={setImportantOnly}
          onArchivedChange={setArchivedFilter}
        />
      </div>

      {loading && <LoadingSpinner label="Loading documents…" />}
      {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
      {!loading && !error && (
        <DocumentList
          documents={documents}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
          onToggleArchive={handleToggleArchive}
          onToggleImportant={handleToggleImportant}
        />
      )}

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          currentTitle={renameTarget.title}
          onCancel={() => setRenameTarget(null)}
          onSave={handleRename}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
