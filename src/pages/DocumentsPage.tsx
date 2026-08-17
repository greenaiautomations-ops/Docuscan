import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDocuments } from '../hooks/useDocuments'
import { useFolders } from '../hooks/useFolders'
import { DocumentList } from '../components/documents/DocumentList'
import { DocumentSearchBar } from '../components/documents/DocumentSearchBar'
import { DocumentFilters } from '../components/documents/DocumentFilters'
import { FolderSidebar } from '../components/documents/FolderSidebar'
import { UploadButton } from '../components/documents/UploadButton'
import { RenameDialog } from '../components/documents/RenameDialog'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { renameDocument, setArchived, setImportant } from '../services/documentService'
import { setDocumentFolder } from '../services/folderService'
import { removeDocument } from '../services/uploadService'
import type { Document } from '../types/document'

export function DocumentsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [importantOnly, setImportantOnly] = useState(false)
  const [archived, setArchivedFilter] = useState(false)
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined)
  const [renameTarget, setRenameTarget] = useState<Document | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null)

  const filters = useMemo(
    () => ({ search, category, status, importantOnly, archived, folderId }),
    [search, category, status, importantOnly, archived, folderId],
  )

  const { documents, loading, error, refresh, setDocuments } = useDocuments(filters)
  const { folders, counts, refresh: refreshFolders } = useFolders()

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
    refreshFolders()
    setDeleteTarget(null)
  }

  const handleToggleArchive = async (doc: Document) => {
    const updated = await setArchived(doc.id, !doc.is_archived)
    setDocuments((prev) => prev.filter((d) => d.id !== updated.id))
    refreshFolders()
  }

  const handleToggleImportant = async (doc: Document) => {
    const updated = await setImportant(doc.id, !doc.is_important)
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }

  const handleMoveToFolder = async (doc: Document, newFolderId: string | null) => {
    const updated = await setDocumentFolder(doc.id, newFolderId)
    // If we're viewing a specific folder, a document moved out of it should
    // disappear from the current list rather than show a stale folder badge.
    setDocuments((prev) =>
      folderId !== undefined && newFolderId !== folderId
        ? prev.filter((d) => d.id !== doc.id)
        : prev.map((d) => (d.id === updated.id ? updated : d)),
    )
    refreshFolders()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('documentsPage.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('documentsPage.subtitle')}</p>
        </div>
        <UploadButton />
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <FolderSidebar
          folders={folders}
          counts={counts}
          selected={folderId}
          onSelect={setFolderId}
          onFoldersChanged={refreshFolders}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
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

          {loading && <LoadingSpinner label={t('documentsPage.loading')} />}
          {!loading && error && <ErrorMessage message={error} onRetry={refresh} />}
          {!loading && !error && (
            <DocumentList
              documents={documents}
              folders={folders}
              onRename={setRenameTarget}
              onDelete={setDeleteTarget}
              onToggleArchive={handleToggleArchive}
              onToggleImportant={handleToggleImportant}
              onMoveToFolder={handleMoveToFolder}
            />
          )}
        </div>
      </div>

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
        title={t('documentsPage.deleteDocument.title')}
        message={t('documentsPage.deleteDocument.message', { title: deleteTarget?.title })}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
