import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getDocument,
  setImportant,
  setArchived,
  retryProcessing,
} from '../services/documentService'
import { getSignedUrl } from '../services/storageService'
import { removeDocument } from '../services/uploadService'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { StatusBadge, ImportanceBadge } from '../components/common/Badge'
import { formatDateTime, formatFileSize, titleCase } from '../utils/formatters'
import type { Document } from '../types/document'

const AI_PLACEHOLDER_SECTIONS = [
  { title: 'AI Summary', description: 'An AI-generated summary of this document will appear here.' },
  { title: 'Translation', description: 'Translate this document into your preferred language.' },
  { title: 'Important Dates', description: 'Deadlines and dates extracted from this document.' },
  { title: 'Payments', description: 'Amounts due and payment details extracted from this document.' },
  { title: 'Appointments', description: 'Appointments or bookings found in this document.' },
  { title: 'AI Chat', description: 'Ask questions about this document once processing is available.' },
]

export function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [document, setDocument] = useState<Document | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const doc = await getDocument(id)
      if (!doc) {
        setError('Document not found.')
        return
      }
      setDocument(doc)
      if (doc.file_path) {
        const url = await getSignedUrl(doc.file_path)
        setPreviewUrl(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleToggleImportant = async () => {
    if (!document) return
    const updated = await setImportant(document.id, !document.is_important)
    setDocument(updated)
  }

  const handleToggleArchive = async () => {
    if (!document) return
    const updated = await setArchived(document.id, !document.is_archived)
    setDocument(updated)
  }

  const handleRetry = async () => {
    if (!document) return
    const updated = await retryProcessing(document.id)
    setDocument(updated)
  }

  const handleDelete = async () => {
    if (!document) return
    await removeDocument(document)
    navigate('/documents', { replace: true })
  }

  if (loading) return <LoadingSpinner fullHeight label="Loading document…" />
  if (error) return <ErrorMessage message={error} onRetry={load} />
  if (!document) return null

  const isImage = document.file_type.startsWith('image/')
  const isPdf = document.file_type === 'application/pdf'

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{document.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={document.status} />
              <ImportanceBadge importance={document.importance} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewUrl && (
              <a
                href={previewUrl}
                download
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Download
              </a>
            )}
            <button
              onClick={handleToggleImportant}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {document.is_important ? 'Unmark important' : 'Mark important'}
            </button>
            <button
              onClick={handleToggleArchive}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {document.is_archived ? 'Unarchive' : 'Archive'}
            </button>
            {document.status === 'failed' && (
              <button
                onClick={handleRetry}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Retry processing
              </button>
            )}
            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="flex min-h-[400px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {!previewUrl && <p className="text-sm text-slate-400">Preview unavailable.</p>}
          {previewUrl && isImage && (
            <img src={previewUrl} alt={document.title} className="max-h-[70vh] w-auto object-contain" />
          )}
          {previewUrl && isPdf && (
            <iframe title={document.title} src={previewUrl} className="h-[70vh] w-full" />
          )}
          {previewUrl && !isImage && !isPdf && (
            <p className="text-sm text-slate-500">Preview not supported for this file type.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-700">Coming in Phase 2</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AI_PLACEHOLDER_SECTIONS.map((section) => (
              <div
                key={section.title}
                className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"
              >
                <p className="text-sm font-medium text-slate-700">{section.title}</p>
                <p className="mt-1 text-xs text-slate-400">{section.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">File information</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Category</dt>
              <dd className="text-slate-700">{titleCase(document.category)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Type</dt>
              <dd className="text-slate-700">{document.file_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Size</dt>
              <dd className="text-slate-700">{formatFileSize(document.file_size)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Uploaded</dt>
              <dd className="text-slate-700">{formatDateTime(document.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Updated</dt>
              <dd className="text-slate-700">{formatDateTime(document.updated_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Status</dt>
              <dd><StatusBadge status={document.status} /></dd>
            </div>
          </dl>
        </div>
      </aside>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete document"
        message={`Are you sure you want to delete "${document.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
