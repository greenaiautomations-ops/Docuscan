interface DocumentSearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function DocumentSearchBar({ value, onChange }: DocumentSearchBarProps) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search documents by title…"
      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:max-w-xs"
    />
  )
}
