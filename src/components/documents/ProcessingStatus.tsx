import { useTranslation } from 'react-i18next'
import type { Document } from '../../types/document'
import { friendlyProcessingError } from '../../utils/formatters'

interface ProcessingStatusProps {
  document: Document
  onRetry?: () => void
  retrying?: boolean
}

function stageLabel(document: Document, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (document.status === 'uploading') return t('processingStatus.uploading')
  if (document.status === 'failed') return friendlyProcessingError(document.error_message, t)
  if (document.status === 'completed') return t('processingStatus.complete')
  if (document.processing_stage) return t(`processingStage.${document.processing_stage}`)
  if (document.status === 'uploaded') return t('processingStatus.reading')
  if (document.status === 'analyzed') return t('processingStatus.creatingSummary')
  return t('processingStatus.processing')
}

export function ProcessingStatus({ document, onRetry, retrying }: ProcessingStatusProps) {
  const { t } = useTranslation()
  const isFailed = document.status === 'failed'
  const isDone = document.status === 'completed'
  const isActive = !isFailed && !isDone

  return (
    <div className="flex items-center gap-2 text-sm">
      {isActive && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-indigo-600" />
      )}
      {isDone && <span className="text-emerald-600 dark:text-emerald-400">●</span>}
      {isFailed && <span className="text-red-500 dark:text-red-400">●</span>}
      <span className={isFailed ? 'text-red-600 dark:text-red-400' : isDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
        {stageLabel(document, t)}
      </span>
      {isFailed && onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="ml-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-60"
        >
          {retrying ? t('processingStatus.retrying') : t('processingStatus.retry')}
        </button>
      )}
    </div>
  )
}
