import type { ReactElement } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../hooks/useTheme'
import type { ThemePreference } from '../../contexts/ThemeContext'

const OPTIONS: { value: ThemePreference; icon: ReactElement }[] = [
  {
    value: 'light',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <circle cx="8" cy="8" r="3.2" />
        <path d="M8 1v1.4M8 13.6V15M15 8h-1.4M2.4 8H1M12.7 3.3l-1 1M4.3 11.7l-1 1M12.7 12.7l-1-1M4.3 4.3l-1-1" />
      </svg>
    ),
  },
  {
    value: 'dark',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.5 9.5A5.8 5.8 0 0 1 6.5 2.5a5.8 5.8 0 1 0 7 7z" />
      </svg>
    ),
  },
  {
    value: 'system',
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1.5" y="2.5" width="13" height="8.5" rx="1.2" />
        <path d="M5.5 14h5M8 11v3" />
      </svg>
    ),
  },
]

const BUTTON_SIZE = 26
const GAP = 2

/** Professional light/dark/system segmented control with a sliding highlight. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()
  const activeIndex = OPTIONS.findIndex((o) => o.value === theme)

  return (
    <div
      role="radiogroup"
      aria-label={t('theme.label')}
      className="relative inline-flex items-center gap-0.5 rounded-full border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 p-1"
    >
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-white dark:bg-slate-950 shadow-sm transition-transform duration-200 ease-out"
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          top: 4,
          left: 4,
          transform: `translateX(${activeIndex * (BUTTON_SIZE + GAP)}px)`,
        }}
      />
      {OPTIONS.map((opt) => {
        const isActive = opt.value === theme
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(opt.value)}
            title={t(`theme.${opt.value}`)}
            aria-label={t(`theme.${opt.value}`)}
            className={`relative z-10 flex items-center justify-center rounded-full transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            style={{ width: BUTTON_SIZE, height: BUTTON_SIZE }}
          >
            {opt.icon}
          </button>
        )
      })}
    </div>
  )
}
