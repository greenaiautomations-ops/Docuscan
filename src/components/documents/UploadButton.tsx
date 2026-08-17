import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function UploadButton() {
  const { t } = useTranslation()
  return (
    <Link
      to="/upload"
      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
    >
      + {t('common.uploadDocument')}
    </Link>
  )
}
