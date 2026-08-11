import type { Document } from '../../types/document'
import { DocumentCard } from './DocumentCard'
import { EmptyState } from '../common/EmptyState'
import { UploadButton } from './UploadButton'

interface DocumentListProps {
  documents: Document[]
  onRename: (doc: Document) => void
  onDelete: (doc: Document) => void
  onToggleArchive: (doc: Document) => void
  onToggleImportant: (doc: Document) => void
}

export function DocumentList({
  documents,
  onRename,
  onDelete,
  onToggleArchive,
  onToggleImportant,
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
          onRename={onRename}
          onDelete={onDelete}
          onToggleArchive={onToggleArchive}
          onToggleImportant={onToggleImportant}
        />
      ))}
    </div>
  )
}
