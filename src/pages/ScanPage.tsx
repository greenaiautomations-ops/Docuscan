import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CameraCapture } from '../components/scan/CameraCapture'
import { useAuth } from '../hooks/useAuth'
import { uploadDocument } from '../services/uploadService'
import { StatusBadge } from '../components/common/Badge'
import { friendlyProcessingError, isUpgradeError } from '../utils/formatters'
import type { DocumentStatus } from '../types/document'

export function ScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [status, setStatus] = useState<DocumentStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCapture = async (blob: Blob) => {
    if (!user) return
    setSaving(true)
    setError(null)
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: 'image/jpeg' })
    try {
      await uploadDocument({
        userId: user.id,
        file,
        title: t('scanPage.scannedTitle', { datetime: new Date().toLocaleString() }),
        onStatusChange: setStatus,
      })
      navigate('/documents')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('scanPage.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('scanPage.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('scanPage.subtitle')}</p>
      </div>

      <CameraCapture onCapture={handleCapture} />

      {saving && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>{t('scanPage.savingScan')}</span>
          {status && <StatusBadge status={status} />}
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {friendlyProcessingError(error, t)}
          {isUpgradeError(error) && (
            <>
              {' '}
              <Link to="/billing" className="font-medium underline underline-offset-2">
                {t('common.viewPlans')}
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  )
}
