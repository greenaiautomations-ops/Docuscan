import type {
  ChatRole,
  Database,
  DocumentImportance,
  DocumentStatus,
  NotificationType,
  OcrStatus,
  ProcessingStage,
  TranslationLanguage,
  TranslationScope,
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

export type ChatMessage = Database['public']['Tables']['document_chat_messages']['Row']
export type Translation = Database['public']['Tables']['document_translations']['Row']

export type {
  DocumentStatus,
  DocumentImportance,
  NotificationType,
  ProcessingStage,
  ChatRole,
  TranslationLanguage,
  TranslationScope,
  OcrStatus,
}

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

// ---------------------------------------------------------------------
// Phase 2 — AI document intelligence
// ---------------------------------------------------------------------

export const AI_DOCUMENT_TYPES = [
  'invoice',
  'contract',
  'government_letter',
  'university_document',
  'employment_document',
  'bank_document',
  'insurance',
  'tax',
  'rental',
  'utility_bill',
  'appointment',
  'certificate',
  'receipt',
  'subscription',
  'other',
] as const

export type AiDocumentType = (typeof AI_DOCUMENT_TYPES)[number]

export const PROCESSING_STAGE_LABELS: Record<ProcessingStage, string> = {
  reading: 'Reading…',
  extracting_text: 'Extracting text…',
  understanding: 'Understanding…',
  finding_important_information: 'Finding important information…',
  creating_summary: 'Creating summary…',
}

export const TRANSLATION_LANGUAGES: { code: TranslationLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ru', label: 'Russian' },
]

/** A single extracted field with its confidence score, or null if not found in the document. */
export interface ExtractedField {
  value: string
  confidence: number
}

export interface ExtractedData {
  document_title: ExtractedField | null
  issuer: ExtractedField | null
  recipient: ExtractedField | null
  names: ExtractedField[]
  organizations: ExtractedField[]
  addresses: ExtractedField[]
  document_date: ExtractedField | null
  effective_date: ExtractedField | null
  expiry_date: ExtractedField | null
  deadline: ExtractedField | null
  appointment_datetime: ExtractedField | null
  payment_amount: ExtractedField | null
  currency: ExtractedField | null
  payment_due_date: ExtractedField | null
  invoice_number: ExtractedField | null
  reference_number: ExtractedField | null
  contract_number: ExtractedField | null
  customer_number: ExtractedField | null
  phone: ExtractedField | null
  email: ExtractedField | null
  iban: ExtractedField | null
  required_action: ExtractedField | null
  priority: 'low' | 'medium' | 'high' | null
  summary_sections?: SummarySections
}

export interface SummarySections {
  overview: string
  what_is_this: string
  who_sent_it: string
  what_it_means: string
  what_to_do: string
  has_deadline: boolean
  deadline_detail: string | null
  involves_money: boolean
  money_detail: string | null
  next_action: string
}

export const NON_TERMINAL_STATUSES: DocumentStatus[] = ['uploading', 'uploaded', 'processing', 'analyzed']
export const ACTIVE_PROCESSING_STATUSES: DocumentStatus[] = ['uploaded', 'processing', 'analyzed']
