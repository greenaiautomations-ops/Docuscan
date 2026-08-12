import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useDocumentProcessing } from '../hooks/useDocumentProcessing'
import { UploadDropzone } from '../components/documents/UploadDropzone'
import { ProcessingStatus } from '../components/documents/ProcessingStatus'
import { DOCUMENT_CATEGORIES, type DocumentCategory } from '../types/document'
import { uploadDocument, retryUpload } from '../services/uploadService'
import { getDocument } from '../services/documentService'
import { friendlyProcessingError, titleCase } from '../utils/formatters'

interface UploadItem {
  id: string
  file: File
  documentId?: string
  failedBeforeUpload?: boolean
  error?: string
}

function UploadItemRow({
  item,
  onRetry,
}: {
  item: UploadItem
  onRetry: (item: UploadItem) => void
}) {
  const { document } = useDocumentProcessing(item.documentId)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{item.file.name}</p>
        {item.error && <p className="text-xs text-red-600">{friendlyProcessingError(item.error)}</p>}
      </div>
      {document ? (
        <ProcessingStatus document={document} onRetry={() => onRetry(item)} />
      ) : (
        <span className="text-xs text-slate-400">Starting…</span>
      )}
    </div>
  )
}

export function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState<DocumentCategory>('uncategorized')
  const [items, setItems] = useState<UploadItem[]>([])

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const runUpload = async (item: UploadItem) => {
    if (!user) return
    try {
      const doc = await uploadDocument({ userId: user.id, file: item.file, category })
      updateItem(item.id, { documentId: doc.id, failedBeforeUpload: false, error: undefined })
    } catch (err) {
      updateItem(item.id, {
        failedBeforeUpload: true,
        error: err instanceof Error ? err.message : 'Upload failed.',
      })
    }
  }

  const handleRetry = async (item: UploadItem) => {
    if (!user) return
    updateItem(item.id, { error: undefined })
    try {
      if (item.documentId) {
        const existing = await getDocument(item.documentId)
        if (!existing) throw new Error('Original document record was not found.')
        await retryUpload(existing, item.file)
        updateItem(item.id, { failedBeforeUpload: false })
      } else {
        await runUpload(item)
      }
    } catch (err) {
      updateItem(item.id, {
        failedBeforeUpload: true,
        error: err instanceof Error ? err.message : 'Upload failed.',
      })
    }
  }

  const handleFilesSelected = (files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
    }))
    setItems((prev) => [...newItems, ...prev])
    newItems.forEach((item) => void runUpload(item))
  }

  const canNavigate = items.length > 0 && items.every((i) => i.documentId || i.failedBeforeUpload)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Upload documents</h1>
        <p className="text-sm text-slate-500">
          Upload PDF, JPG, PNG, or WEBP files up to 25MB each. AI processing (OCR, classification,
          summary) continues in the background — feel free to move on once uploads finish.
        </p>
      </div>

      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </select>
      </div>

      <UploadDropzone onFilesSelected={handleFilesSelected} />

      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Upload progress</h2>
          {items.map((item) =>
            item.documentId ? (
              <UploadItemRow key={item.id} item={item} onRetry={handleRetry} />
            ) : (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.file.name}</p>
                  {item.error && <p className="text-xs text-red-600">{friendlyProcessingError(item.error)}</p>}
                </div>
                {item.failedBeforeUpload ? (
                  <button
                    onClick={() => handleRetry(item)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Retry
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Uploading…</span>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {canNavigate && (
        <button
          onClick={() => navigate('/documents')}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Go to Documents
        </button>
      )}
    </div>
  )
}
