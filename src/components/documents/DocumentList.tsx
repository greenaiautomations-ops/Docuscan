import type { Document, Folder } from '../../types/document'
import { DocumentCard } from './DocumentCard'
import { EmptyState } from '../common/EmptyState'
import { UploadButton } from './UploadButton'

interface DocumentListProps {
  documents: Document[]
  folders: Folder[]
  onRename: (doc: Document) => void
  onDelete: (doc: Document) => void
  onToggleArchive: (doc: Document) => void
  onToggleImportant: (doc: Document) => void
  onMoveToFolder: (doc: Document, folderId: string | null) => void
}

export function DocumentList({
  documents,
  folders,
  onRename,
  onDelete,
  onToggleArchive,
  onToggleImportant,
  onMoveToFolder,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="No documents found"
        description="Try adjusting your search or filters, or upload your first document."
        action={<UploadButton />}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          folders={folders}
          onRename={onRename}
          onDelete={onDelete}
          onToggleArchive={onToggleArchive}
          onToggleImportant={onToggleImportant}
          onMoveToFolder={onMoveToFolder}
        />
      ))}
    </div>
  )
}
