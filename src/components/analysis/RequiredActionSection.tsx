import { useTranslation } from 'react-i18next'
import type { ExtractedData } from '../../types/document'

const PRIORITY_STYLES: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  medium: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
  high: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
}

export function RequiredActionSection({ data }: { data: ExtractedData }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('analysis.requiredAction.title')}</h2>
        {data.priority && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[data.priority]}`}
          >
            {t('analysis.requiredAction.priorityLabel', { priority: t(`priority.${data.priority}`, { defaultValue: data.priority }) })}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">
        {data.required_action?.value ?? t('analysis.requiredAction.noAction')}
      </p>
    </div>
  )
}
