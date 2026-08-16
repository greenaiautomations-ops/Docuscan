import { useEffect, useState } from 'react'
import { Modal } from '../common/Modal'
import { FOLDER_COLORS } from '../../types/document'
import { FOLDER_COLOR_STYLES } from '../../utils/constants'
import { createFolder, updateFolder } from '../../services/folderService'
import type { Folder, FolderColor } from '../../types/document'

interface FolderModalProps {
  open: boolean
  /** Pass an existing folder to edit it, or null to create a new one. */
  folder: Folder | null
  onClose: () => void
  onSaved: (folder: Folder) => void
}

export function FolderModal({ open, folder, onClose, onSaved }: FolderModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<FolderColor>('blue')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(folder?.name ?? '')
    setColor(folder?.color ?? 'blue')
    setError(null)
  }, [open, folder])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Give the folder a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = folder ? await updateFolder(folder.id, { name, color }) : await createFolder(name, color)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this folder.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} title={folder ? 'Edit folder' : 'New folder'} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. Taxes, Finance, Marketing"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Color</label>
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full ${FOLDER_COLOR_STYLES[c].solid} ${
                  color === c ? `ring-2 ring-offset-2 ${FOLDER_COLOR_STYLES[c].ring}` : ''
                }`}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : folder ? 'Save changes' : 'Create folder'}
        </button>
      </div>
    </Modal>
  )
}
