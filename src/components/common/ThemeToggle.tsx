import { useTheme } from '../../hooks/useTheme'

/** Compact icon button for the header — quickly flips light/dark. For explicit
 * control over "system", see the Appearance section on the Settings page. */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-lg border border-slate-300 dark:border-slate-600 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
    >
      {isDark ? '☀' : '☾'}
    </button>
  )
}
