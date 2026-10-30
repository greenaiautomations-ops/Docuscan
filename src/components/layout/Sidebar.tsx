import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV_ITEMS, ADMIN_NAV_ITEM } from '../../utils/constants'
import { Logo } from '../common/Logo'
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  open: boolean
  onNavigate?: () => void
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { count } = useUnreadNotificationCount()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const items = profile?.role === 'admin' ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS

  return (
    <aside
      id="app-navigation"
      className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] overflow-y-auto transform border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-transform duration-200 ease-in-out lg:static lg:visible lg:shrink-0 lg:translate-x-0 ${
        open ? 'visible translate-x-0' : 'invisible -translate-x-full'
      }`}
    >
      <div className="flex h-16 items-center border-b border-slate-200 dark:border-slate-700 px-6">
        <Logo size={32} withWordmark />
        <button onClick={onNavigate} aria-label={t('common.close')} className="ml-auto min-h-11 min-w-11 rounded-lg lg:hidden">✕</button>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/' || item.path === '/dashboard'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <span>{t(`nav.${item.key}`)}</span>
            {item.path === '/notifications' && count > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
