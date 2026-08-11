// Supabase Edge Function: translate-document
// Translates the full OCR text, the AI summary, or an arbitrary selected
// excerpt into one of the supported languages. Never modifies the original
// OCR/document — results are stored separately in document_translations.

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import { translateText } from '../_shared/anthropicProvider.ts'

const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'zh', 'ru']

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = getUserClient(req)
    await requireUser(supabase)

    const body = await req.json().catch(() => ({}))
    const documentId: string = body.documentId
    const language: string = body.language
    const scope: string = body.scope ?? 'full'
    const selectionText: string | undefined = body.text

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpError(400, 'documentId is required.')
    }
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      throw new HttpError(400, `language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`)
    }
    if (!['full', 'summary', 'selection'].includes(scope)) {
      throw new HttpError(400, 'scope must be full, summary, or selection.')
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .maybeSingle()
    if (docError) throw new HttpError(500, docError.message)
    if (!document) throw new HttpError(404, 'Document not found.')

    let sourceText: string

    if (scope === 'selection') {
      if (!selectionText || !selectionText.trim()) {
        throw new HttpError(400, 'text is required when scope is "selection".')
      }
      if (selectionText.length > 5000) {
        throw new HttpError(400, 'Selected text is too long (max 5000 characters).')
      }
      sourceText = selectionText.trim()
    } else if (scope === 'summary') {
      const { data: analysis, error } = await supabase
        .from('document_analysis')
        .select('summary')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new HttpError(500, error.message)
      if (!analysis?.summary) throw new HttpError(409, 'No summary available yet for this document.')
      sourceText = analysis.summary
    } else {
      const { data: ocr, error } = await supabase
        .from('document_ocr')
        .select('raw_text')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw new HttpError(500, error.message)
      if (!ocr?.raw_text) throw new HttpError(409, 'No OCR text available yet for this document.')
      sourceText = ocr.raw_text
    }

    const translatedText = await translateText(sourceText, language)

    if (scope === 'selection') {
      const { data: row, error } = await supabase
        .from('document_translations')
        .insert({
          document_id: documentId,
          language,
          scope,
          source_excerpt: sourceText,
          translated_text: translatedText,
        })
        .select()
        .single()
      if (error) throw new HttpError(500, error.message)
      return jsonResponse({ translation: row })
    }

    await supabase
      .from('document_translations')
      .delete()
      .eq('document_id', documentId)
      .eq('language', language)
      .eq('scope', scope)

    const { data: row, error } = await supabase
      .from('document_translations')
      .insert({ document_id: documentId, language, scope, translated_text: translatedText })
      .select()
      .single()
    if (error) throw new HttpError(500, error.message)

    return jsonResponse({ translation: row })
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status)
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    return jsonResponse({ error: message }, 500)
  }
})
