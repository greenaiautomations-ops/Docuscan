import { supabase } from '../lib/supabase'
import type {
  Document,
  DocumentAnalysis,
  DocumentInsert,
  DocumentOcr,
  DocumentPage,
  DocumentStatus,
  DocumentUpdate,
  ExtractedData,
} from '../types/document'

export interface DocumentFilters {
  search?: string
  category?: string
  status?: string
  importantOnly?: boolean
  archived?: boolean
}

/** Lists the current user's documents (RLS restricts rows to owner automatically). */
export async function listDocuments(filters: DocumentFilters = {}): Promise<Document[]> {
  let query = supabase.from('documents').select('*').order('created_at', { ascending: false })

  query = query.eq('is_archived', filters.archived ?? false)

  const term = filters.search?.trim()
  if (term) {
    // Matches on title (substring) OR the full-text search vector, which is
    // built from title, issuer, document type, category, tags, the AI
    // summary, and the raw OCR text (see refresh_document_search_vector()).
    query = query.or(`title.ilike.%${term}%,search_vector.wfts(english).${term}`)
  }
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category)
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as DocumentStatus)
  }
  if (filters.importantOnly) {
    query = query.eq('is_important', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getDocument(id: string): Promise<Document | null> {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createDocument(input: DocumentInsert): Promise<Document> {
  const { data, error } = await supabase.from('documents').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateDocument(id: string, updates: DocumentUpdate): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) throw error
}

export async function renameDocument(id: string, title: string): Promise<Document> {
  return updateDocument(id, { title })
}

export async function setArchived(id: string, isArchived: boolean): Promise<Document> {
  return updateDocument(id, { is_archived: isArchived })
}

export async function setImportant(id: string, isImportant: boolean): Promise<Document> {
  return updateDocument(id, { is_important: isImportant })
}

// ---------------------------------------------------------------------
// Phase 2 — AI analysis, OCR, pages
// ---------------------------------------------------------------------

export async function getDocumentOcr(documentId: string): Promise<DocumentOcr | null> {
  const { data, error } = await supabase
    .from('document_ocr')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getDocumentPages(documentId: string): Promise<DocumentPage[]> {
  const { data, error } = await supabase
    .from('document_pages')
    .select('*')
    .eq('document_id', documentId)
    .order('page_number', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getDocumentAnalysis(documentId: string): Promise<DocumentAnalysis | null> {
  const { data, error } = await supabase
    .from('document_analysis')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Saves user corrections to the AI-extracted fields, flagging the analysis as user-edited. */
export async function updateExtractedData(
  analysisId: string,
  extractedData: ExtractedData,
): Promise<DocumentAnalysis> {
  const { data, error } = await supabase
    .from('document_analysis')
    .update({
      extracted_data: extractedData as unknown as Record<string, unknown>,
      edited_by_user: true,
    })
    .eq('id', analysisId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDashboardData() {
  const [totalRes, recentRes, importantRes, actionRequiredRes, notificationsRes] =
    await Promise.all([
      supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('is_archived', false),
      supabase
        .from('documents')
        .select('*')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('documents')
        .select('*')
        .eq('is_archived', false)
        .eq('is_important', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('documents')
        .select('*')
        .eq('is_archived', false)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

  if (totalRes.error) throw totalRes.error
  if (recentRes.error) throw recentRes.error
  if (importantRes.error) throw importantRes.error
  if (actionRequiredRes.error) throw actionRequiredRes.error
  if (notificationsRes.error) throw notificationsRes.error

  return {
    totalDocuments: totalRes.count ?? 0,
    recentDocuments: recentRes.data ?? [],
    importantDocuments: importantRes.data ?? [],
    actionRequiredDocuments: actionRequiredRes.data ?? [],
    recentNotifications: notificationsRes.data ?? [],
  }
}
