import { useCallback, useEffect, useState } from 'react'
import { getUnreadNotificationCount } from '../services/notificationService'

const POLL_INTERVAL_MS = 30000

/** Powers the sidebar notification badge; polls so it updates even without a page navigation (e.g. after a scheduled reminder fires). */
export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const n = await getUnreadNotificationCount()
      setCount(n)
    } catch {
      // Non-critical — the badge just won't update this cycle.
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { count, refresh }
}
