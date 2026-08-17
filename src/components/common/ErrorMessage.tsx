interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 font-medium text-red-800 dark:text-red-300 underline underline-offset-2 hover:text-red-900 dark:hover:text-red-300"
        >
          Try again
        </button>
      )}
    </div>
  )
}
