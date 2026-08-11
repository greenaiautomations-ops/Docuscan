import { useCallback, useEffect, useState } from 'react'
import { listDocuments, type DocumentFilters } from '../services/documentService'
import type { Document } from '../types/document'

export function useDocuments(filters: DocumentFilters) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listDocuments(filters)
      setDocuments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { documents, loading, error, refresh, setDocuments }
}
