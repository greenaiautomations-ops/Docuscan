// Hand-written Supabase database types matching supabase/migrations/*.sql.
// Regenerate with `supabase gen types typescript --linked` once the project
// is linked, and this file can be replaced 1:1.

export type DocumentStatus = 'uploading' | 'processing' | 'completed' | 'failed'
export type DocumentImportance = 'low' | 'normal' | 'high'
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action_required'

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
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          page_number: number
          image_path: string
          extracted_text?: string | null
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          raw_text?: string | null
          confidence?: number | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
