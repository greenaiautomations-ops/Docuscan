import { supabase } from '../lib/supabase'
import type { Folder, FolderColor } from '../types/document'

export async function listFolders(): Promise<Folder[]> {
  const { data, error } = await supabase.from('folders').select('*').order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createFolder(name: string, color: FolderColor): Promise<Folder> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('You must be signed in to create a folder.')

  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: userId, name: name.trim(), color })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error(`A folder named "${name.trim()}" already exists.`)
    throw error
  }
  return data
}

export async function updateFolder(id: string, updates: { name?: string; color?: FolderColor }): Promise<Folder> {
  const patch = { ...updates, name: updates.name?.trim() }
  const { data, error } = await supabase.from('folders').update(patch).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw new Error(`A folder named "${patch.name}" already exists.`)
    throw error
  }
  return data
}

/** Deletes the folder. Documents that were filed in it are never deleted — the
 * database sets their folder_id back to null automatically (on delete set null). */
export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}

export interface FolderCountsSummary {
  /** Document count per folder id (non-archived documents only). */
  byFolder: Record<string, number>
  /** Non-archived documents with no folder assigned. */
  unfiled: number
  /** All non-archived documents, filed or not. */
  total: number
}

/** Document counts for the folder sidebar's "All Documents" / "No Folder" / per-folder rows. */
export async function getFolderCountsSummary(): Promise<FolderCountsSummary> {
  const { data, error } = await supabase.from('documents').select('folder_id').eq('is_archived', false)
  if (error) throw error

  const byFolder: Record<string, number> = {}
  let unfiled = 0
  for (const row of data ?? []) {
    if (row.folder_id) byFolder[row.folder_id] = (byFolder[row.folder_id] ?? 0) + 1
    else unfiled += 1
  }
  return { byFolder, unfiled, total: (data ?? []).length }
}

/** Assigns (or clears, with folderId = null) a document's folder. */
export async function setDocumentFolder(documentId: string, folderId: string | null) {
  const { data, error } = await supabase
    .from('documents')
    .update({ folder_id: folderId })
    .eq('id', documentId)
    .select()
    .single()
  if (error) throw error
  return data
}
