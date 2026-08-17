import { useTranslation } from 'react-i18next'
import { EVENT_TYPE_COLORS, EVENT_STATUS_COMPLETED_COLOR } from '../../utils/constants'
import type { Event } from '../../types/document'

export function EventTypeBadge({ type, status }: { type: string; status?: Event['status'] }) {
  const { t } = useTranslation()
  const style = status === 'completed' ? EVENT_STATUS_COMPLETED_COLOR : (EVENT_TYPE_COLORS[type] ?? EVENT_TYPE_COLORS.other)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {t(`eventType.${type}`, { defaultValue: type })}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation()
  const styles: Record<string, string> = {
    critical: 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400',
    high: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
    medium: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400',
    low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[priority] ?? styles.low}`}>
      {t(`priority.${priority}`, { defaultValue: priority })}
    </span>
  )
}
