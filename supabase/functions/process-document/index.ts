// Supabase Edge Function: process-document
// Pipeline: download file -> OCR -> language detection -> classification ->
// structured extraction -> summary -> embeddings (best-effort) -> search index.
// Runs with the calling user's own JWT, so every DB/storage operation is
// covered by the same RLS policies as the frontend.

import { handleCors, jsonResponse, corsHeaders } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import {
  performOcr,
  classifyDocument,
  extractInformation,
  summarizeDocument,
} from '../_shared/geminiProvider.ts'
import { chunkText, generateEmbedding } from '../_shared/embeddingProvider.ts'
import { syncEventsAndPayments, createRemindersForEvents } from '../_shared/eventExtraction.ts'

const DOCUMENTS_BUCKET = 'documents'

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let supabase: ReturnType<typeof getUserClient>
  let documentId: string

  try {
    supabase = getUserClient(req)
    const user = await requireUser(supabase)

    const body = await req.json().catch(() => ({}))
    documentId = body.documentId
    if (!documentId || typeof documentId !== 'string') {
      throw new HttpError(400, 'documentId is required.')
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle()

    if (docError) throw new HttpError(500, docError.message)
    if (!document) throw new HttpError(404, 'Document not found.')

    try {
      await runPipeline(supabase, document)
      return jsonResponse({ success: true, documentId, status: 'completed' })
    } catch (pipelineError) {
      const message =
        pipelineError instanceof Error ? pipelineError.message : 'Processing failed.'
      await supabase
        .from('documents')
        .update({ status: 'failed', processing_stage: null, error_message: message.slice(0, 1000) })
        .eq('id', documentId)

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'error',
        title: `Processing failed: ${document.title}`,
        message: message.slice(0, 300),
        document_id: documentId,
      })

      return jsonResponse({ success: false, error: message }, 500)
    }
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: err.message }, err.status)
    }
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    return jsonResponse({ error: message }, 500)
  }
})

// deno-lint-ignore no-explicit-any
async function runPipeline(supabase: any, document: any) {
  const documentId = document.id as string

  // Reset for a clean run (also makes retries idempotent).
  await supabase
    .from('documents')
    .update({ status: 'processing', processing_stage: 'reading', error_message: null })
    .eq('id', documentId)

  await Promise.all([
    supabase.from('document_pages').delete().eq('document_id', documentId),
    supabase.from('document_ocr').delete().eq('document_id', documentId),
    supabase.from('document_analysis').delete().eq('document_id', documentId),
    supabase.from('document_embeddings').delete().eq('document_id', documentId),
  ])

  // ---- 1. Download the file from Storage ----
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(document.file_path)
  if (downloadError) throw new Error(`Could not download file: ${downloadError.message}`)

  const arrayBuffer = await fileBlob.arrayBuffer()
  const base64Data = encodeBase64(new Uint8Array(arrayBuffer))

  // ---- 2. OCR ----
  await supabase
    .from('documents')
    .update({ processing_stage: 'extracting_text' })
    .eq('id', documentId)

  const ocrResult = await performOcr(document.file_type, base64Data)
  const rawText = ocrResult.pages.map((p) => p.text).join('\n\n')

  await supabase.from('document_ocr').insert({
    document_id: documentId,
    raw_text: rawText,
    confidence: ocrResult.overall_confidence,
    status: 'completed',
    provider: 'gemini',
  })

  if (ocrResult.pages.length > 0) {
    await supabase.from('document_pages').insert(
      ocrResult.pages.map((page) => ({
        document_id: documentId,
        page_number: page.page_number,
        image_path: document.file_path,
        extracted_text: page.text,
        confidence: page.confidence,
      })),
    )
  }

  // ---- 3. Classification + language detection ----
  await supabase
    .from('documents')
    .update({ processing_stage: 'understanding' })
    .eq('id', documentId)

  const classification = await classifyDocument(rawText)

  // ---- 4. Structured extraction ----
  await supabase
    .from('documents')
    .update({ processing_stage: 'finding_important_information' })
    .eq('id', documentId)

  const extractedData = await extractInformation(rawText)

  // ---- 5. Summary ----
  await supabase
    .from('documents')
    .update({ processing_stage: 'creating_summary' })
    .eq('id', documentId)

  const summary = await summarizeDocument(rawText, extractedData)

  const confidenceValues = [
    classification.confidence,
    extractedData.document_title?.confidence,
    extractedData.issuer?.confidence,
  ].filter((v): v is number => typeof v === 'number')
  const overallConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
      : classification.confidence

  await supabase.from('document_analysis').insert({
    document_id: documentId,
    summary: summary.overview,
    document_type: classification.document_type,
    language: classification.language,
    extracted_data: { ...extractedData, summary_sections: summary },
    confidence: overallConfidence,
  })

  await supabase
    .from('documents')
    .update({
      status: 'analyzed',
      document_type: classification.document_type,
      original_language: classification.language,
      language: classification.language,
      issuer: extractedData.issuer?.value ?? null,
    })
    .eq('id', documentId)

  // ---- 6. Events, payments & reminders (Phase 3) ----
  // Reprocessing is dedup-safe: syncEventsAndPayments keys off
  // (document_id, source_field) and never touches rows the user has
  // already confirmed, edited, dismissed, or completed.
  await supabase
    .from('documents')
    .update({ processing_stage: 'creating_events' })
    .eq('id', documentId)

  try {
    const eventIds = await syncEventsAndPayments(
      supabase,
      {
        id: documentId,
        user_id: document.user_id,
        document_type: classification.document_type,
        importance: document.importance,
      },
      extractedData,
    )
    await createRemindersForEvents(supabase, document.user_id, eventIds)
  } catch (eventError) {
    // Event/reminder creation is important but must never take down an
    // otherwise-successful document analysis.
    console.error('Event/reminder sync failed:', eventError)
  }

  // ---- 7. Search index ----
  await supabase.rpc('refresh_document_search_vector', { p_document_id: documentId })

  // ---- 8. Embeddings (best-effort, non-fatal) ----
  try {
    const chunks = chunkText(rawText)
    if (chunks.length > 0) {
      const rows = []
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await generateEmbedding(chunks[i])
        rows.push({ document_id: documentId, chunk_index: i, content: chunks[i], embedding })
      }
      if (rows.length > 0) {
        await supabase.from('document_embeddings').insert(rows)
      }
    }
  } catch {
    // Embeddings are optional in Phase 2 (Phase 3 search groundwork). A
    // missing VOYAGE_API_KEY or a provider error should never fail the
    // document pipeline.
  }

  // ---- 9. Done ----
  await supabase
    .from('documents')
    .update({ status: 'completed', processing_stage: null })
    .eq('id', documentId)

  await supabase.from('notifications').insert({
    user_id: document.user_id,
    type: 'success',
    title: `"${document.title}" is ready`,
    message: summary.overview.slice(0, 300),
    document_id: documentId,
  })
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

// Re-export for consistent CORS usage if this module is imported elsewhere.
export { corsHeaders }
