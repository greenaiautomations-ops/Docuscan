import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">404</h1>
      <p className="text-sm text-slate-500">This page doesn&apos;t exist.</p>
      <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        Back to dashboard
      </Link>
    </div>
  )
}
