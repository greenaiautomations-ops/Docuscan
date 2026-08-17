import { formatConfidence, titleCase } from '../../utils/formatters'

interface DocumentTypeCardProps {
  documentType: string | null
  language: string | null
  confidence: number | null
}

export function DocumentTypeCard({ documentType, language, confidence }: DocumentTypeCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Document Type</h2>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
          {documentType ? titleCase(documentType) : 'Unclassified'}
        </span>
        {language && <span className="text-sm text-slate-500 dark:text-slate-400">Language: {language}</span>}
        {typeof confidence === 'number' && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{formatConfidence(confidence)} confidence</span>
        )}
      </div>
    </div>
  )
}
