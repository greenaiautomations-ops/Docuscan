import { invokeFunction } from '../lib/functionsClient'

export interface ProcessDocumentResult {
  success: boolean
  documentId: string
  status?: string
  error?: string
}

/**
 * Invokes the process-document Edge Function, which runs the full
 * OCR -> classification -> extraction -> summary pipeline server-side.
 * The document's `status`/`processing_stage` columns update live in the
 * database while this runs — poll or refetch the document to reflect
 * progress in the UI instead of waiting on this promise alone.
 */
export async function processDocument(documentId: string): Promise<ProcessDocumentResult> {
  return invokeFunction<ProcessDocumentResult>('process-document', { documentId })
}
