import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-800 text-center">
      <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t('notFound.title')}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('notFound.message')}</p>
      <Link to="/" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
        {t('notFound.backLink')}
      </Link>
    </div>
  )
}
