import { createDocument, updateDocument, deleteDocument } from './documentService'
import { buildDocumentPath, uploadDocumentFile, deleteDocumentFile } from './storageService'
import { validateFile } from '../utils/validation'
import type { Document, DocumentCategory } from '../types/document'

export interface UploadOptions {
  userId: string
  file: File
  title?: string
  category?: DocumentCategory
  onStatusChange?: (status: Document['status']) => void
}

/**
 * Orchestrates the full Phase 1 upload pipeline:
 * validate -> create document row (uploading) -> push file to storage ->
 * flip to processing -> flip to completed (or failed + rollback on error).
 *
 * Phase 2 will replace the "processing -> completed" step with a real
 * OCR/AI Edge Function that updates the row asynchronously instead.
 */
export async function uploadDocument({
  userId,
  file,
  title,
  category = 'uncategorized',
  onStatusChange,
}: UploadOptions): Promise<Document> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const documentTitle = title?.trim() || file.name

  let document = await createDocument({
    user_id: userId,
    title: documentTitle,
    file_path: '',
    file_type: file.type,
    file_size: file.size,
    category,
    status: 'uploading',
  })
  onStatusChange?.('uploading')

  const path = buildDocumentPath(userId, document.id, file.name)

  try {
    await uploadDocumentFile(path, file)
    document = await updateDocument(document.id, { file_path: path, status: 'processing' })
    onStatusChange?.('processing')

    // Phase 1 has no backend processing worker yet, so we finalize
    // immediately. Phase 2 hooks in here with real OCR/AI analysis.
    document = await updateDocument(document.id, { status: 'completed' })
    onStatusChange?.('completed')

    return document
  } catch (err) {
    await updateDocument(document.id, { status: 'failed' }).catch(() => undefined)
    onStatusChange?.('failed')
    throw err
  }
}

/** Retries a failed upload by re-uploading the same file to the existing document row. */
export async function retryUpload(document: Document, file: File): Promise<Document> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  await updateDocument(document.id, { status: 'uploading' })
  const path = buildDocumentPath(document.user_id, document.id, file.name)

  try {
    await uploadDocumentFile(path, file)
    let updated = await updateDocument(document.id, { file_path: path, status: 'processing' })
    updated = await updateDocument(document.id, { status: 'completed' })
    return updated
  } catch (err) {
    await updateDocument(document.id, { status: 'failed' }).catch(() => undefined)
    throw err
  }
}

/** Deletes a document row and its storage file together. */
export async function removeDocument(document: Document): Promise<void> {
  if (document.file_path) {
    await deleteDocumentFile(document.file_path).catch(() => undefined)
  }
  await deleteDocument(document.id)
}
