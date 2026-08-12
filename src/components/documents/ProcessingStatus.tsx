import { PROCESSING_STAGE_LABELS, type Document } from '../../types/document'
import { friendlyProcessingError } from '../../utils/formatters'

interface ProcessingStatusProps {
  document: Document
  onRetry?: () => void
  retrying?: boolean
}

function stageLabel(document: Document): string {
  if (document.status === 'uploading') return 'Uploading…'
  if (document.status === 'failed') return friendlyProcessingError(document.error_message)
  if (document.status === 'completed') return 'Complete ✓'
  if (document.processing_stage) return PROCESSING_STAGE_LABELS[document.processing_stage]
  if (document.status === 'uploaded') return 'Reading…'
  if (document.status === 'analyzed') return 'Creating summary…'
  return 'Processing…'
}

export function ProcessingStatus({ document, onRetry, retrying }: ProcessingStatusProps) {
  const isFailed = document.status === 'failed'
  const isDone = document.status === 'completed'
  const isActive = !isFailed && !isDone

  return (
    <div className="flex items-center gap-2 text-sm">
      {isActive && (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      )}
      {isDone && <span className="text-emerald-600">●</span>}
      {isFailed && <span className="text-red-500">●</span>}
      <span className={isFailed ? 'text-red-600' : isDone ? 'text-emerald-700' : 'text-slate-600'}>
        {stageLabel(document)}
      </span>
      {isFailed && onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="ml-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
        >
          {retrying ? 'Retrying…' : 'Retry'}
        </button>
      )}
    </div>
  )
}
