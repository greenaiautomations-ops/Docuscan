import { supabase } from '../lib/supabase'
import type { Document, DocumentInsert, DocumentStatus, DocumentUpdate } from '../types/document'

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

  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`)
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

export async function retryProcessing(id: string): Promise<Document> {
  return updateDocument(id, { status: 'processing' })
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
