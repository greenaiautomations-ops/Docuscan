import { supabase } from '../lib/supabase'
import type { Translation, TranslationLanguage, TranslationScope } from '../types/document'

export async function listTranslations(documentId: string): Promise<Translation[]> {
  const { data, error } = await supabase
    .from('document_translations')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Translates the document (full text, summary, or a selected excerpt) via the translate-document Edge Function. */
export async function translateDocument(params: {
  documentId: string
  language: TranslationLanguage
  scope: TranslationScope
  text?: string
}): Promise<Translation> {
  const { data, error } = await supabase.functions.invoke('translate-document', {
    body: params,
  })

  if (error) throw new Error(error.message ?? 'Translation failed.')
  if (data?.error) throw new Error(data.error)
  return data.translation as Translation
}
