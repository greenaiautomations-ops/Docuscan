import { useTranslation } from 'react-i18next'

interface DocumentSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function DocumentSearchBar({ value, onChange }: DocumentSearchBarProps) {
  const { t } = useTranslation()
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t('documentSearchBar.placeholder')}
      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:max-w-xs"
    />
  )
}
