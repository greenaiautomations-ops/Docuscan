import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800 text-center">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">404</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">This page doesn&apos;t exist.</p>
      <Link to="/" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
        Back to dashboard
      </Link>
    </div>
  )
}
