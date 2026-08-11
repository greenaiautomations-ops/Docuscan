import { useCallback, useEffect, useRef, useState } from 'react'
import { listDocuments, type DocumentFilters } from '../services/documentService'
import { NON_TERMINAL_STATUSES, type Document } from '../types/document'

const POLL_INTERVAL_MS = 3000

export function useDocuments(filters: DocumentFilters) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listDocuments(filters)
      setDocuments(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents.')
      return null
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      const data = await refresh()
      if (cancelled) return
      const hasActiveProcessing = data?.some((doc) => NON_TERMINAL_STATUSES.includes(doc.status))
      if (hasActiveProcessing) {
        timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    tick()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [refresh])

  return { documents, loading, error, refresh, setDocuments }
}
