// Hand-written Supabase database types matching supabase/migrations/*.sql.
// Regenerate with `supabase gen types typescript --linked` once the project
// is linked, and this file can be replaced 1:1.

export type DocumentStatus =
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'analyzed'
  | 'completed'
  | 'failed'
export type ProcessingStage =
  | 'reading'
  | 'extracting_text'
  | 'understanding'
  | 'finding_important_information'
  | 'creating_summary'
  | 'creating_events'
export type DocumentImportance = 'low' | 'normal' | 'high'
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action_required'
export type ChatRole = 'user' | 'assistant'
export type TranslationLanguage = 'en' | 'de' | 'es' | 'zh' | 'ru'
export type TranslationScope = 'full' | 'summary' | 'selection'
export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

// ---- Phase 3 ----
export type EventType = 'deadline' | 'appointment' | 'payment_due' | 'renewal' | 'expiration' | 'task' | 'other'
export type EventStatus = 'needs_review' | 'confirmed' | 'completed' | 'dismissed'
export type EventPriority = 'critical' | 'high' | 'medium' | 'low'
export type PaymentStatus = 'pending' | 'paid' | 'cancelled' | 'disputed' | 'unknown'
export type RecurrenceInterval = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type ReminderType = 'seven_days' | 'three_days' | 'one_day' | 'same_day' | 'custom'
export type NotificationEventType = 'reminder' | string

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string | null
          preferred_language: string
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          preferred_language?: string
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          category: string
          document_type: string | null
          original_language: string | null
          status: DocumentStatus
          importance: DocumentImportance
          is_important: boolean
          is_archived: boolean
          processing_stage: ProcessingStage | null
          error_message: string | null
          issuer: string | null
          language: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          category?: string
          document_type?: string | null
          original_language?: string | null
          status?: DocumentStatus
          importance?: DocumentImportance
          is_important?: boolean
          is_archived?: boolean
          processing_stage?: ProcessingStage | null
          error_message?: string | null
          issuer?: string | null
          language?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
        Relationships: []
      }
      document_pages: {
        Row: {
          id: string
          document_id: string
          page_number: number
          image_path: string
          extracted_text: string | null
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          page_number: number
          image_path: string
          extracted_text?: string | null
          confidence?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_pages']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_pages_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      document_ocr: {
        Row: {
          id: string
          document_id: string
          raw_text: string | null
          confidence: number | null
          status: OcrStatus
          error_message: string | null
          provider: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          raw_text?: string | null
          confidence?: number | null
          status?: OcrStatus
          error_message?: string | null
          provider?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_ocr']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_ocr_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      document_analysis: {
        Row: {
          id: string
          document_id: string
          summary: string | null
          document_type: string | null
          extracted_data: Record<string, unknown>
          confidence: number | null
          language: string | null
          edited_by_user: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          summary?: string | null
          document_type?: string | null
          extracted_data?: Record<string, unknown>
          confidence?: number | null
          language?: string | null
          edited_by_user?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_analysis']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_analysis_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tags']['Insert']>
        Relationships: []
      }
      document_tags: {
        Row: {
          document_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          document_id: string
          tag_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_tags']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_tags_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'document_tags_tag_id_fkey'
            columns: ['tag_id']
            referencedRelation: 'tags'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string | null
          document_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type?: NotificationType
          title: string
          message?: string | null
          document_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'notifications_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      document_chat_messages: {
        Row: {
          id: string
          user_id: string
          document_id: string
          role: ChatRole
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id: string
          role: ChatRole
          content: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_chat_messages']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_chat_messages_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      document_translations: {
        Row: {
          id: string
          document_id: string
          language: TranslationLanguage
          scope: TranslationScope
          source_excerpt: string | null
          translated_text: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          language: TranslationLanguage
          scope?: TranslationScope
          source_excerpt?: string | null
          translated_text: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_translations']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_translations_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      document_embeddings: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          embedding: number[] | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index?: number
          content: string
          embedding?: number[] | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['document_embeddings']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'document_embeddings_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      events: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          type: EventType
          title: string
          description: string | null
          event_date: string | null
          event_time: string | null
          location: string | null
          priority: EventPriority
          status: EventStatus
          source_confidence: number | null
          source_field: string | null
          is_user_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          type: EventType
          title: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          location?: string | null
          priority?: EventPriority
          status?: EventStatus
          source_confidence?: number | null
          source_field?: string | null
          is_user_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['events']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'events_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          id: string
          user_id: string
          document_id: string | null
          event_id: string | null
          amount: number | null
          currency: string | null
          recipient: string | null
          due_date: string | null
          reference_number: string | null
          status: PaymentStatus
          recurring: boolean
          recurrence_interval: RecurrenceInterval | null
          confidence: number | null
          is_user_edited: boolean
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_id?: string | null
          event_id?: string | null
          amount?: number | null
          currency?: string | null
          recipient?: string | null
          due_date?: string | null
          reference_number?: string | null
          status?: PaymentStatus
          recurring?: boolean
          recurrence_interval?: RecurrenceInterval | null
          confidence?: number | null
          is_user_edited?: boolean
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'payments_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          event_id: string
          reminder_date: string
          reminder_type: ReminderType
          sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          reminder_date: string
          reminder_type: ReminderType
          sent?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'reminders_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          seven_days: boolean
          three_days: boolean
          one_day: boolean
          same_day: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          seven_days?: boolean
          three_days?: boolean
          one_day?: boolean
          same_day?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>
        Relationships: []
      }
      notification_events: {
        Row: {
          id: string
          user_id: string
          event_id: string | null
          type: string
          title: string
          message: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id?: string | null
          type?: string
          title: string
          message?: string | null
          read?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['notification_events']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'notification_events_event_id_fkey'
            columns: ['event_id']
            referencedRelation: 'events'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      refresh_document_search_vector: {
        Args: { p_document_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
