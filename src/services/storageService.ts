import { supabase, DOCUMENTS_BUCKET } from '../lib/supabase'
import { sanitizeFileName } from '../utils/validation'

/** Builds the storage object path for a user's document file. */
export function buildDocumentPath(userId: string, documentId: string, fileName: string): string {
  return `${userId}/${documentId}/${sanitizeFileName(fileName)}`
}

export async function uploadDocumentFile(path: string, file: File | Blob): Promise<void> {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error
}

export async function getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function downloadDocumentFile(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).download(path)
  if (error) throw error
  return data
}

export async function deleteDocumentFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([path])
  if (error) throw error
}

export async function deleteDocumentFolder(userId: string, documentId: string): Promise<void> {
  const folder = `${userId}/${documentId}`
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).list(folder)
  if (error) throw error
  if (!data || data.length === 0) return
  const paths = data.map((item) => `${folder}/${item.name}`)
  const { error: removeError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths)
  if (removeError) throw removeError
}
