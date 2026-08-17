import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) return <LoadingSpinner fullHeight label={t('layout.checkingSession')} />
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}
