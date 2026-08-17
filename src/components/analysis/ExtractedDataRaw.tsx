import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ExtractedData } from '../../types/document'

export function ExtractedDataRaw({ data }: { data: ExtractedData }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { summary_sections: _summarySections, ...rest } = data

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('analysis.extractedDataRaw.title')}</h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {open ? t('analysis.extractedDataRaw.hideJson') : t('analysis.extractedDataRaw.showJson')}
        </span>
      </button>
      {open && (
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-400">
          {JSON.stringify(rest, null, 2)}
        </pre>
      )}
    </div>
  )
}
