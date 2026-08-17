import { useState } from 'react'
import { Modal } from '../common/Modal'
import { translateDocument } from '../../services/translationService'
import { TRANSLATION_LANGUAGES, type TranslationLanguage, type TranslationScope } from '../../types/document'

interface TranslatePanelProps {
  documentId: string
  open: boolean
  onClose: () => void
}

export function TranslatePanel({ documentId, open, onClose }: TranslatePanelProps) {
  const [language, setLanguage] = useState<TranslationLanguage>('en')
  const [scope, setScope] = useState<TranslationScope>('summary')
  const [selectionText, setSelectionText] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTranslate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const translation = await translateDocument({
        documentId,
        language,
        scope,
        text: scope === 'selection' ? selectionText : undefined,
      })
      setResult(translation.translated_text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="Translate" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as TranslationLanguage)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {TRANSLATION_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">What to translate</label>
          <div className="flex gap-2">
            {(['summary', 'full', 'selection'] as TranslationScope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize ${
                  scope === s
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                    : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {s === 'selection' ? 'Custom text' : s}
              </button>
            ))}
          </div>
        </div>

        {scope === 'selection' && (
          <textarea
            value={selectionText}
            onChange={(e) => setSelectionText(e.target.value)}
            placeholder="Paste or type the text you want translated…"
            rows={4}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {result && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300">
            {result}
          </div>
        )}

        <button
          onClick={handleTranslate}
          disabled={loading || (scope === 'selection' && !selectionText.trim())}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Translating…' : 'Translate'}
        </button>
      </div>
    </Modal>
  )
}
