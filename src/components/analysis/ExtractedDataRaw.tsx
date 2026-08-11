import { useState } from 'react'
import type { ExtractedData } from '../../types/document'

export function ExtractedDataRaw({ data }: { data: ExtractedData }) {
  const [open, setOpen] = useState(false)
  const { summary_sections: _summarySections, ...rest } = data

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold text-slate-700">Extracted Data</h2>
        <span className="text-xs text-slate-400">{open ? 'Hide raw JSON' : 'Show raw JSON'}</span>
      </button>
      {open && (
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          {JSON.stringify(rest, null, 2)}
        </pre>
      )}
    </div>
  )
}
