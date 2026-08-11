import type {
  Database,
  DocumentImportance,
  DocumentStatus,
  NotificationType,
} from './database.types'

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type DocumentPage = Database['public']['Tables']['document_pages']['Row']
export type DocumentOcr = Database['public']['Tables']['document_ocr']['Row']
export type DocumentAnalysis = Database['public']['Tables']['document_analysis']['Row']

export type Tag = Database['public']['Tables']['tags']['Row']
export type DocumentTag = Database['public']['Tables']['document_tags']['Row']

export type Notification = Database['public']['Tables']['notifications']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type { DocumentStatus, DocumentImportance, NotificationType }

export const DOCUMENT_CATEGORIES = [
  'uncategorized',
  'identification',
  'financial',
  'medical',
  'legal',
  'insurance',
  'education',
  'property',
  'employment',
  'other',
] as const

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const

export const ACCEPTED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB

export interface DocumentWithTags extends Document {
  tags: Tag[]
}

export interface DashboardStats {
  totalDocuments: number
  recentDocuments: Document[]
  importantDocuments: Document[]
  actionRequiredDocuments: Document[]
  recentNotifications: Notification[]
}
