import { supabase } from '../lib/supabase'
import type { Tag } from '../types/document'

export async function listTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function createTag(userId: string, name: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function attachTag(documentId: string, tagId: string): Promise<void> {
  const { error } = await supabase.from('document_tags').insert({ document_id: documentId, tag_id: tagId })
  if (error) throw error
}

export async function detachTag(documentId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('document_tags')
    .delete()
    .eq('document_id', documentId)
    .eq('tag_id', tagId)
  if (error) throw error
}
