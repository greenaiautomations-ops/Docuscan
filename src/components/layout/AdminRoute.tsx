import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../common/LoadingSpinner'

/** Gates a route to admins only. Client-side convenience — the real enforcement is RLS/`is_admin()` in Postgres. */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) return <LoadingSpinner fullHeight label={t('layout.checkingAccess')} />
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
