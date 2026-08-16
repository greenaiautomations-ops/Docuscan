import type {
  ChatRole,
  Database,
  DocumentImportance,
  DocumentStatus,
  EventPriority,
  EventStatus,
  EventType,
  FolderColor,
  NotificationType,
  OcrStatus,
  PaymentStatus,
  ProcessingStage,
  RecurrenceInterval,
  ReminderType,
  TranslationLanguage,
  TranslationScope,
} from './database.types'

export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']

export type Folder = Database['public']['Tables']['folders']['Row']
export type FolderInsert = Database['public']['Tables']['folders']['Insert']
export type FolderUpdate = Database['public']['Tables']['folders']['Update']

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
  EventType,
  EventStatus,
  EventPriority,
  PaymentStatus,
  RecurrenceInterval,
  ReminderType,
  FolderColor,
}

export type Event = Database['public']['Tables']['events']['Row']
export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']

export type Payment = Database['public']['Tables']['payments']['Row']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']

export type Reminder = Database['public']['Tables']['reminders']['Row']
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row']
export type NotificationEvent = Database['public']['Tables']['notification_events']['Row']

export interface EventWithPayment extends Event {
  payment?: Payment | null
}

export interface PaymentWithEvent extends Payment {
  event?: Event | null
}

/** A single item in the merged Notification Center feed (Phase 1 `notifications` + Phase 3 `notification_events`). */
export interface UnifiedNotification {
  id: string
  source: 'document' | 'event'
  type: string
  title: string
  message: string | null
  documentId: string | null
  eventId: string | null
  read: boolean
  createdAt: string
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

export interface DocumentWithFolder extends Document {
  folder: Folder | null
}

export const FOLDER_COLORS: FolderColor[] = [
  'red',
  'orange',
  'amber',
  'emerald',
  'teal',
  'blue',
  'indigo',
  'purple',
  'pink',
  'slate',
]

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
  creating_events: 'Finding dates and payments…',
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
