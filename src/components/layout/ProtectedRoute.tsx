import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) return <LoadingSpinner fullHeight label={t('layout.checkingSession')} />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  return <>{children}</>
}
