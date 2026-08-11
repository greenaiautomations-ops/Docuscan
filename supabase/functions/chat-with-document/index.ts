// Supabase Edge Function: chat-with-document
// Answers a question about ONE document using only that document's OCR text
// and structured analysis as context. Persists both turns to
// document_chat_messages so history is kept per document.

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import { answerQuestion, type ChatTurn } from '../_shared/anthropicProvider.ts'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = getUserClient(req)
    const user = await requireUser(supabase)

    const body = await req.json().catch(() => ({}))
    const documentId: string = body.documentId
    const message: string = (body.message ?? '').trim()

    if (!documentId || typeof documentId !== 'string') {
      throw new HttpError(400, 'documentId is required.')
    }
    if (!message) {
      throw new HttpError(400, 'message is required.')
    }
    if (message.length > 2000) {
      throw new HttpError(400, 'message is too long (max 2000 characters).')
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, document_type, status')
      .eq('id', documentId)
      .maybeSingle()
    if (docError) throw new HttpError(500, docError.message)
    if (!document) throw new HttpError(404, 'Document not found.')

    if (document.status !== 'analyzed' && document.status !== 'completed') {
      throw new HttpError(409, 'This document has not finished processing yet.')
    }

    const [{ data: ocrRow }, { data: analysisRow }, { data: historyRows, error: historyError }] =
      await Promise.all([
        supabase
          .from('document_ocr')
          .select('raw_text')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('document_analysis')
          .select('summary, document_type, extracted_data')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('document_chat_messages')
          .select('role, content')
          .eq('document_id', documentId)
          .order('created_at', { ascending: true })
          .limit(20),
      ])
    if (historyError) throw new HttpError(500, historyError.message)

    const context = [
      `Title: ${document.title}`,
      `Type: ${analysisRow?.document_type ?? document.document_type ?? 'unknown'}`,
      analysisRow?.summary ? `Summary: ${analysisRow.summary}` : null,
      analysisRow?.extracted_data
        ? `Extracted data: ${JSON.stringify(analysisRow.extracted_data)}`
        : null,
      ocrRow?.raw_text ? `Full document text:\n${ocrRow.raw_text}` : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    const history: ChatTurn[] = (historyRows ?? []).map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }))

    const { error: insertUserError } = await supabase.from('document_chat_messages').insert({
      user_id: user.id,
      document_id: documentId,
      role: 'user',
      content: message,
    })
    if (insertUserError) throw new HttpError(500, insertUserError.message)

    const reply = await answerQuestion(context, history, message)

    const { data: assistantRow, error: insertAssistantError } = await supabase
      .from('document_chat_messages')
      .insert({ user_id: user.id, document_id: documentId, role: 'assistant', content: reply })
      .select()
      .single()
    if (insertAssistantError) throw new HttpError(500, insertAssistantError.message)

    return jsonResponse({ reply, message: assistantRow })
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status)
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    return jsonResponse({ error: message }, 500)
  }
})
