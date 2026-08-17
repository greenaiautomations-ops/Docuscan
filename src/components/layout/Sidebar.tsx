import { NavLink } from 'react-router-dom'
import { NAV_ITEMS, ADMIN_NAV_ITEM, APP_NAME } from '../../utils/constants'
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount'
import { useAuth } from '../../hooks/useAuth'

interface SidebarProps {
  open: boolean
  onNavigate?: () => void
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { count } = useUnreadNotificationCount()
  const { profile } = useAuth()
  const items = profile?.role === 'admin' ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 dark:border-slate-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          D
        </div>
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{APP_NAME}</span>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`
            }
          >
            <span>{item.label}</span>
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
