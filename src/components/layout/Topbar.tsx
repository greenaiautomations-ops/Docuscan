import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../common/SignOutButton'
import { ThemeToggle } from '../common/ThemeToggle'
import { LanguageToggle } from '../common/LanguageToggle'

interface TopbarProps {
  menuOpen: boolean
  onMenuClick: () => void
}

export function Topbar({ onMenuClick, menuOpen }: TopbarProps) {
  const { profile, user } = useAuth()
  const { t } = useTranslation()

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
        <SignOutButton />
      </div>
    </header>
  )
}
