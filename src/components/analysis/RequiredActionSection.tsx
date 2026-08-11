import type { ExtractedData } from '../../types/document'

const PRIORITY_STYLES: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

export function RequiredActionSection({ data }: { data: ExtractedData }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Required Action</h2>
        {data.priority && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[data.priority]}`}
          >
            {data.priority} priority
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700">
        {data.required_action?.value ?? 'No specific action required.'}
      </p>
    </div>
  )
}
