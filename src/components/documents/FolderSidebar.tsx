import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { FolderModal } from './FolderModal'
import { FOLDER_COLOR_STYLES } from '../../utils/constants'
import { deleteFolder, type FolderCountsSummary } from '../../services/folderService'
import type { Folder } from '../../types/document'

interface FolderSidebarProps {
  folders: Folder[]
  counts: FolderCountsSummary
  /** undefined = "All Documents", null = "No Folder", a folder id = that folder. */
  selected: string | null | undefined
  onSelect: (folderId: string | null | undefined) => void
  onFoldersChanged: () => void
}

export function FolderSidebar({ folders, counts, selected, onSelect, onFoldersChanged }: FolderSidebarProps) {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null)
  const [deleting, setDeleting] = useState(false)

  const openCreate = () => {
    setEditingFolder(null)
    setModalOpen(true)
  }

  const openEdit = (folder: Folder) => {
    setEditingFolder(folder)
    setModalOpen(true)
  }

  const handleSaved = (folder: Folder) => {
    setModalOpen(false)
    onSelect(folder.id)
    onFoldersChanged()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFolder(deleteTarget.id)
      if (selected === deleteTarget.id) onSelect(undefined)
      onFoldersChanged()
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const rowClass = (isActive: boolean) =>
    `group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
      isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`

  return (
    <div className="flex w-full shrink-0 flex-col gap-1 sm:w-56">
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('folderSidebar.heading')}</h2>
        <button
          onClick={openCreate}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          title={t('folderSidebar.newFolderTitle')}
        >
          {t('folderSidebar.newFolder')}
        </button>
      </div>

      <button onClick={() => onSelect(undefined)} className={rowClass(selected === undefined)}>
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        <span className="flex-1 truncate text-left">{t('folderSidebar.allDocuments')}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{counts.total}</span>
      </button>

      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

      {folders.length === 0 && (
        <p className="px-2.5 py-2 text-xs text-slate-400 dark:text-slate-500">{t('folderSidebar.empty')}</p>
      )}

      {folders.map((folder) => {
        const styles = FOLDER_COLOR_STYLES[folder.color] ?? FOLDER_COLOR_STYLES.slate
        return (
          <div key={folder.id} className={rowClass(selected === folder.id)}>
            <button onClick={() => onSelect(folder.id)} className="flex flex-1 items-center gap-2 overflow-hidden text-left">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} />
              <span className="flex-1 truncate">{folder.name}</span>
              <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{counts.byFolder[folder.id] ?? 0}</span>
            </button>
            <span className="hidden shrink-0 items-center gap-1 group-hover:flex">
              <button
                onClick={() => openEdit(folder)}
                title={t('folderSidebar.editFolder')}
                className="rounded p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
              >
                ✎
              </button>
              <button
                onClick={() => setDeleteTarget(folder)}
                title={t('folderSidebar.deleteFolder')}
                className="rounded p-0.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
              >
                ✕
              </button>
            </span>
          </div>
        )
      })}

      <FolderModal open={modalOpen} folder={editingFolder} onClose={() => setModalOpen(false)} onSaved={handleSaved} />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('folderSidebar.deleteConfirm.title')}
        message={t('folderSidebar.deleteConfirm.message', { name: deleteTarget?.name })}
        confirmLabel={deleting ? t('folderSidebar.deleting') : t('common.delete')}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
