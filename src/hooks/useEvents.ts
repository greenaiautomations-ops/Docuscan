import { useCallback, useEffect, useState } from 'react'
import { listEvents, type EventFilters } from '../services/eventService'
import type { Event } from '../types/document'

export function useEvents(filters: EventFilters = {}) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listEvents(filters)
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { events, loading, error, refresh, setEvents }
}
