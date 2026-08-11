import { useCallback, useEffect, useRef, useState } from 'react'
import { getDocument } from '../services/documentService'
import { NON_TERMINAL_STATUSES } from '../types/document'
import type { Document } from '../types/document'

const POLL_INTERVAL_MS = 2000

/**
 * Loads a document and polls it while OCR/AI processing is in flight
 * (status in uploading/uploaded/processing/analyzed), so the UI can show
 * live processing-stage updates without a page refresh. Stops polling once
 * the document reaches a terminal status (completed/failed) or is deleted.
 */
export function useDocumentProcessing(documentId: string | undefined) {
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (!documentId) return
    try {
      const doc = await getDocument(documentId)
      setDocument(doc)
      setError(null)
      return doc
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document.')
      return null
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      const doc = await load()
      if (cancelled) return
      if (doc && NON_TERMINAL_STATUSES.includes(doc.status)) {
        timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    tick()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [load])

  return { document, setDocument, loading, error, refresh: load }
}
