import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { updateExtractedData } from '../../services/documentService'
import type { DocumentAnalysis, ExtractedData } from '../../types/document'

interface EditInformationModalProps {
  open: boolean
  analysis: DocumentAnalysis
  onClose: () => void
  onSaved: (analysis: DocumentAnalysis) => void
}

type EditableKey =
  | 'document_title'
  | 'issuer'
  | 'recipient'
  | 'document_date'
  | 'deadline'
  | 'payment_amount'
  | 'currency'
  | 'payment_due_date'
  | 'required_action'

const EDITABLE_KEYS: EditableKey[] = [
  'document_title',
  'issuer',
  'recipient',
  'document_date',
  'deadline',
  'payment_amount',
  'currency',
  'payment_due_date',
  'required_action',
]

export function EditInformationModal({ open, analysis, onClose, onSaved }: EditInformationModalProps) {
  const { t } = useTranslation()
  const extractedData = analysis.extracted_data as unknown as ExtractedData
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(EDITABLE_KEYS.map((key) => [key, extractedData?.[key]?.value ?? ''])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated: ExtractedData = { ...extractedData }
      for (const key of EDITABLE_KEYS) {
        const raw = values[key]?.trim()
        // User-entered values are treated as fully confident corrections.
        updated[key] = raw ? { value: raw, confidence: 1 } : null
      }
      const saved = await updateExtractedData(analysis.id, updated)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('analysis.editInfo.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={t('analysis.editInfo.title')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        <p className="text-xs text-slate-400 dark:text-slate-500">{t('analysis.editInfo.note')}</p>
        {EDITABLE_KEYS.map((key) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              {t(`analysis.editInfo.fields.${key}`)}
            </label>
            <input
              value={values[key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('analysis.editInfo.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? t('analysis.editInfo.saving') : t('analysis.editInfo.saveChanges')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
