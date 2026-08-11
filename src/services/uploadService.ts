import { createDocument, updateDocument, deleteDocument } from './documentService'
import { buildDocumentPath, uploadDocumentFile, deleteDocumentFile } from './storageService'
import { processDocument } from './processingService'
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
 * Orchestrates the Phase 1+2 upload pipeline:
 * validate -> create document row (uploading) -> push file to storage ->
 * flip to uploaded -> kick off server-side OCR/AI processing.
 *
 * Processing runs in a Supabase Edge Function and can take up to a minute,
 * updating `status`/`processing_stage` on the document row as it goes.
 * This function does not wait for processing to finish — callers should
 * poll/refetch the document (see useDocumentProcessing) to reflect progress.
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
    document = await updateDocument(document.id, { file_path: path, status: 'uploaded' })
    onStatusChange?.('uploaded')

    // Fire-and-forget: the Edge Function updates status/processing_stage on
    // the document row throughout, and marks status='failed' on error, so
    // there's nothing further to do with this promise here.
    void processDocument(document.id).catch(() => undefined)

    return document
  } catch (err) {
    await updateDocument(document.id, { status: 'failed', error_message: 'File upload failed.' }).catch(
      () => undefined,
    )
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

  await updateDocument(document.id, { status: 'uploading', error_message: null })
  const path = buildDocumentPath(document.user_id, document.id, file.name)

  try {
    await uploadDocumentFile(path, file)
    const updated = await updateDocument(document.id, { file_path: path, status: 'uploaded' })
    void processDocument(document.id).catch(() => undefined)
    return updated
  } catch (err) {
    await updateDocument(document.id, { status: 'failed', error_message: 'File upload failed.' }).catch(
      () => undefined,
    )
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
