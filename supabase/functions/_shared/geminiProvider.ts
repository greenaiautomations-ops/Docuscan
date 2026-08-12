// AI provider implementation backed by Google's Gemini API. Exposes the same
// function signatures as anthropicProvider.ts (performOcr, classifyDocument,
// extractInformation, summarizeDocument, translateText, answerQuestion) so
// the Edge Functions can swap providers by changing a single import.
//
// Gemini's Flash models have a genuine free tier (no credit card required
// via Google AI Studio keys) and support native PDF/image understanding
// plus JSON-mode structured output, which is what this file uses.

import { fetchWithRetry } from './httpRetry.ts'
import {
  ClassificationResultSchema,
  ExtractedDataSchema,
  OcrResultSchema,
  SummaryResultSchema,
  parseJsonWithSchema,
  type ClassificationResult,
  type ExtractedData,
  type OcrResult,
  type SummaryResult,
} from './schemas.ts'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
// Flash-Lite, not the full Flash alias: Google's free tier for the full Flash
// model family was cut hard in late 2025 (as low as ~20 requests/day in some
// configurations), while Flash-Lite keeps a much higher free daily quota
// (historically ~1,000/day). Override with GEMINI_MODEL if you're on a paid
// plan and want the full model's higher quality.
const DEFAULT_MODEL = 'gemini-flash-lite-latest'

function getApiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Set it with `supabase secrets set GEMINI_API_KEY=...` ' +
        '(get a free key at https://aistudio.google.com/apikey).',
    )
  }
  return key
}

function getModel(): string {
  return Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL
}

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }

interface GeminiCallOptions {
  system: string
  parts: GeminiPart[]
  maxTokens?: number
  jsonMode?: boolean
}

/** Low-level call to the Gemini generateContent API. Returns the raw text reply. */
async function callGemini({ system, parts, maxTokens = 4096, jsonMode = false }: GeminiCallOptions): Promise<string> {
  const url = `${GEMINI_API_BASE}/${getModel()}:generateContent`

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': getApiKey(),
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: {
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Gemini API error (${response.status}): ${body.slice(0, 500)}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  if (!candidate) {
    const blockReason = data.promptFeedback?.blockReason
    throw new Error(`Gemini API returned no candidates.${blockReason ? ` Blocked: ${blockReason}` : ''}`)
  }
  if (candidate.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
    throw new Error(`Gemini API stopped early: ${candidate.finishReason}`)
  }

  const text = candidate.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('')
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('Gemini API returned no text content.')
  }
  return text
}

/**
 * Calls Gemini in JSON mode and validates the reply against a Zod schema.
 * If the first reply fails validation, retries once with an explicit
 * correction instruction. Throws (rather than saving) if it still fails,
 * so the pipeline can mark the document as failed instead of corrupting data.
 */
async function callGeminiForJson<T>(
  options: Omit<GeminiCallOptions, 'jsonMode'>,
  schema: Parameters<typeof parseJsonWithSchema<T>>[1],
): Promise<T> {
  const firstReply = await callGemini({ ...options, jsonMode: true })
  try {
    return parseJsonWithSchema(firstReply, schema)
  } catch (firstError) {
    const retryReply = await callGemini({
      ...options,
      jsonMode: true,
      parts: [
        ...options.parts,
        {
          text:
            `Your previous reply could not be parsed as valid JSON matching the required schema ` +
            `(error: ${firstError instanceof Error ? firstError.message : String(firstError)}). ` +
            `Reply again with ONLY valid JSON, no markdown fences, no commentary.`,
        },
      ],
    })
    return parseJsonWithSchema(retryReply, schema)
  }
}

// Some browsers/OSes report JPEGs as "image/jpg", which isn't a registered
// MIME type — Gemini expects the standard "image/jpeg". Everything else we
// accept (application/pdf, image/png, image/webp) is already standard.
function normalizeMimeType(fileType: string): string {
  return fileType === 'image/jpg' ? 'image/jpeg' : fileType
}

function fileToPart(fileType: string, base64Data: string): GeminiPart {
  return { inline_data: { mime_type: normalizeMimeType(fileType), data: base64Data } }
}

// ---------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------
export async function performOcr(fileType: string, base64Data: string): Promise<OcrResult> {
  return callGeminiForJson(
    {
      system:
        'You are a precise OCR engine. Transcribe every page of the provided document exactly as ' +
        'written, preserving reading order. Do not summarize, translate, or correct spelling. If a ' +
        'page has no legible text, use an empty string. Reply with ONLY JSON matching this shape: ' +
        '{"pages": [{"page_number": number, "text": string, "confidence": number between 0 and 1}], ' +
        '"overall_confidence": number between 0 and 1}. Confidence reflects how legible/certain the ' +
        'transcription is, not document quality.',
      parts: [
        fileToPart(fileType, base64Data),
        { text: 'Transcribe this document. Reply with only the JSON object.' },
      ],
      maxTokens: 32768,
    },
    OcrResultSchema,
  )
}

// ---------------------------------------------------------------------
// Classification + language detection
// ---------------------------------------------------------------------
export async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  return callGeminiForJson(
    {
      system:
        'Classify the document type and detect its language from the OCR text below. ' +
        'document_type must be exactly one of: invoice, contract, government_letter, ' +
        'university_document, employment_document, bank_document, insurance, tax, rental, ' +
        'utility_bill, appointment, certificate, receipt, subscription, other. ' +
        'language should be the language name in English (e.g. "English", "German"). ' +
        'Reply with ONLY JSON: {"document_type": string, "language": string, "confidence": number 0-1}.',
      parts: [{ text: ocrText.slice(0, 20000) }],
      maxTokens: 512,
    },
    ClassificationResultSchema,
  )
}

// ---------------------------------------------------------------------
// Structured information extraction
// ---------------------------------------------------------------------
export async function extractInformation(ocrText: string): Promise<ExtractedData> {
  return callGeminiForJson(
    {
      system:
        'Extract structured information from the OCR text below. Only include values that are ' +
        'explicitly present in the text — NEVER invent or guess missing information; use null for ' +
        'anything not present. Every extracted value must include a confidence score between 0 and 1. ' +
        'Dates should be normalized to YYYY-MM-DD where possible, otherwise keep the original text. ' +
        'Reply with ONLY JSON matching this exact shape (use null for missing scalar fields, [] for ' +
        'missing lists):\n' +
        '{"document_title": {"value": string, "confidence": number} | null, ' +
        '"issuer": FIELD | null, "recipient": FIELD | null, ' +
        '"names": [FIELD], "organizations": [FIELD], "addresses": [FIELD], ' +
        '"document_date": FIELD | null, "effective_date": FIELD | null, "expiry_date": FIELD | null, ' +
        '"deadline": FIELD | null, "appointment_datetime": FIELD | null, ' +
        '"payment_amount": FIELD | null, "currency": FIELD | null, "payment_due_date": FIELD | null, ' +
        '"invoice_number": FIELD | null, "reference_number": FIELD | null, "contract_number": FIELD | null, ' +
        '"customer_number": FIELD | null, "phone": FIELD | null, "email": FIELD | null, "iban": FIELD | null, ' +
        '"required_action": FIELD | null, "priority": "low" | "medium" | "high" | null} ' +
        'where FIELD = {"value": string, "confidence": number}.',
      parts: [{ text: ocrText.slice(0, 20000) }],
      maxTokens: 4096,
    },
    ExtractedDataSchema,
  )
}

// ---------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------
export async function summarizeDocument(
  ocrText: string,
  extractedData: ExtractedData,
): Promise<SummaryResult> {
  return callGeminiForJson(
    {
      system:
        'Summarize the document for someone who has not read it. Base every answer strictly on the ' +
        'OCR text and extracted data provided — clearly separate facts stated in the document from any ' +
        'interpretation you add. If something is unknown, say so plainly instead of guessing. ' +
        'Reply with ONLY JSON: {"overview": string (2-3 sentences), "what_is_this": string, ' +
        '"who_sent_it": string, "what_it_means": string, "what_to_do": string, ' +
        '"has_deadline": boolean, "deadline_detail": string | null, ' +
        '"involves_money": boolean, "money_detail": string | null, "next_action": string}.',
      parts: [
        {
          text: `OCR TEXT:\n${ocrText.slice(0, 15000)}\n\nEXTRACTED DATA:\n${JSON.stringify(extractedData)}`,
        },
      ],
      maxTokens: 2048,
    },
    SummaryResultSchema,
  )
}

// ---------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  es: 'Spanish',
  zh: 'Chinese (Simplified)',
  ru: 'Russian',
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const languageName = LANGUAGE_NAMES[targetLanguage] ?? targetLanguage
  return callGemini({
    system:
      `Translate the given text into ${languageName}. Preserve meaning, tone, and structure. ` +
      'Reply with ONLY the translated text — no preamble, no explanation, no quotes around it.',
    parts: [{ text: text.slice(0, 20000) }],
    maxTokens: 8192,
  })
}

// ---------------------------------------------------------------------
// Document Q&A chat
// ---------------------------------------------------------------------
export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export async function answerQuestion(
  documentContext: string,
  history: ChatTurn[],
  question: string,
): Promise<string> {
  const historyBlock = history
    .slice(-10)
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n')

  return callGemini({
    system:
      'You answer questions about ONE specific document, using only the document context provided below. ' +
      'If the answer is not present in the context, reply exactly: "I couldn\'t find this information in ' +
      'the document." Do not guess, do not use outside knowledge about the sender/topic, and do not ' +
      'invent facts. Keep answers short and direct.\n\n' +
      `DOCUMENT CONTEXT:\n${documentContext.slice(0, 15000)}`,
    parts: [
      {
        text: historyBlock ? `${historyBlock}\nUser: ${question}` : `User: ${question}`,
      },
    ],
    maxTokens: 1024,
  })
}
