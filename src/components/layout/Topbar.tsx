import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { ThemeToggle } from '../common/ThemeToggle'
import { LanguageToggle } from '../common/LanguageToggle'

interface TopbarProps {
  menuOpen: boolean
  onMenuClick: () => void
}

export function Topbar({ onMenuClick, menuOpen }: TopbarProps) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

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

  const displayName = profile?.name || user?.email || t('topbar.account')

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap gap-2 py-2 items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        aria-label={t('topbar.openMenu')}
        aria-expanded={menuOpen}
        aria-controls="app-navigation"
      >
        ☰
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageToggle />
        <ThemeToggle />
        <span className="hidden max-w-48 truncate text-sm text-slate-600 dark:text-slate-400 sm:inline">{displayName}</span>
        <button
          onClick={handleSignOut}
          disabled={busy}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {t('topbar.signOut')}
        </button>
      </div>
      {error && <p role="alert" className="w-full text-sm text-red-600">{t('topbar.signOutError')}</p>}
    </header>
  )
}
