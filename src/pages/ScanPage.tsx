import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraCapture } from '../components/scan/CameraCapture'
import { useAuth } from '../hooks/useAuth'
import { uploadDocument } from '../services/uploadService'
import { StatusBadge } from '../components/common/Badge'
import type { DocumentStatus } from '../types/document'

export function ScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
        title: `Scanned document ${new Date().toLocaleString()}`,
        onStatusChange: setStatus,
      })
      navigate('/documents')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the scan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Scan a document</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Use your camera to capture a document. Edge detection and cleanup arrive in Phase 2.
        </p>
      </div>

      <CameraCapture onCapture={handleCapture} />

      {saving && (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>Saving scan…</span>
          {status && <StatusBadge status={status} />}
        </div>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
