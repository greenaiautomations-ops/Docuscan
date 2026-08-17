import { useRef, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ACCEPTED_FILE_EXTENSIONS } from '../../types/document'
import { validateFile } from '../../utils/validation'

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
}

export function UploadDropzone({ onFilesSelected, disabled }: UploadDropzoneProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setError(null)

    const files = Array.from(fileList)
    const invalid = files.map((f) => validateFile(f)).find((r) => !r.valid)
    if (invalid) {
      setError(invalid.error ?? t('uploadDropzone.invalidFile'))
      return
    }
    onFilesSelected(files)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
    if (disabled) return
    processFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-indigo-400'}`}
      >
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('uploadDropzone.dragDrop')}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">{t('uploadDropzone.fileTypes')}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_EXTENSIONS.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={(e) => processFiles(e.target.files)}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
