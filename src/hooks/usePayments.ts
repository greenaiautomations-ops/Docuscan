import { useCallback, useEffect, useState } from 'react'
import { listPayments, type PaymentFilters } from '../services/paymentService'
import type { Payment } from '../types/document'

export function usePayments(filters: PaymentFilters = {}) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPayments(filters)
      setPayments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { payments, loading, error, refresh, setPayments }
}
