interface LoadingSpinnerProps {
  label?: string
  fullHeight?: boolean
}

export function LoadingSpinner({ label = 'Loading…', fullHeight = false }: LoadingSpinnerProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 ${
        fullHeight ? 'min-h-[50vh]' : 'py-12'
      }`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
