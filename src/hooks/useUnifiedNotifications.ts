import { useCallback, useEffect, useState } from 'react'
import {
  deleteUnifiedNotification,
  listUnifiedNotifications,
  markAllUnifiedAsRead,
  markUnifiedAsRead,
} from '../services/notificationService'
import type { UnifiedNotification } from '../types/document'

export function useUnifiedNotifications() {
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listUnifiedNotifications()
      setNotifications(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const markRead = useCallback(async (notification: UnifiedNotification) => {
    await markUnifiedAsRead(notification)
    setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllUnifiedAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const remove = useCallback(async (notification: UnifiedNotification) => {
    await deleteUnifiedNotification(notification)
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
  }, [])

  return { notifications, loading, error, refresh, markRead, markAllRead, remove }
}
