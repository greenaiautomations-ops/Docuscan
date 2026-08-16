import { useCallback, useEffect, useState } from 'react'
import { getFolderCountsSummary, listFolders, type FolderCountsSummary } from '../services/folderService'
import type { Folder } from '../types/document'

const EMPTY_COUNTS: FolderCountsSummary = { byFolder: {}, unfiled: 0, total: 0 }

export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [counts, setCounts] = useState<FolderCountsSummary>(EMPTY_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [foldersData, countsData] = await Promise.all([listFolders(), getFolderCountsSummary()])
      setFolders(foldersData)
      setCounts(countsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { folders, counts, loading, error, refresh, setFolders }
}
