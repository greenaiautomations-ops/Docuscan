import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'

/** Shared by the landing page and the signed-in app shell. */
export function SignOutButton() {
  const { signOut } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const handleSignOut = async () => {
    setBusy(true)
    setError(false)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch { setError(true) } finally { setBusy(false) }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={handleSignOut} disabled={busy} className="min-h-11 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
        {busy ? t('topbar.signingOut') : t('topbar.signOut')}
      </button>
      {error && <p role="alert" className="max-w-64 text-sm text-red-600">{t('topbar.signOutError')}</p>}
    </div>
  )
}
