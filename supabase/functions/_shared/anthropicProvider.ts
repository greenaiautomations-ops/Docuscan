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

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const DEFAULT_MODEL = 'claude-sonnet-5'

function getApiKey(): string {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it with `supabase secrets set ANTHROPIC_API_KEY=...`.',
    )
  }
  return key
}

function getModel(): string {
  return Deno.env.get('ANTHROPIC_MODEL') || DEFAULT_MODEL
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }

interface ClaudeCallOptions {
  system: string
  content: ContentBlock[]
  maxTokens?: number
}

/** Low-level call to the Anthropic Messages API. Returns the raw text reply. */
async function callClaude({ system, content, maxTokens = 4096 }: ClaudeCallOptions): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': getApiKey(),
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Anthropic API error (${response.status}): ${body.slice(0, 500)}`)
  }

  const data = await response.json()
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text
  if (typeof text !== 'string') {
    throw new Error('Anthropic API returned no text content.')
  }
  return text
}

/**
 * Calls Claude and validates the JSON reply against a Zod schema. If the
 * first reply fails to parse/validate, retries once with an explicit
 * correction instruction. Throws (rather than saving) if it still fails,
 * so the pipeline can mark the document as failed instead of corrupting data.
 */
async function callClaudeForJson<T>(
  options: ClaudeCallOptions,
  schema: Parameters<typeof parseJsonWithSchema<T>>[1],
): Promise<T> {
  const firstReply = await callClaude(options)
  try {
    return parseJsonWithSchema(firstReply, schema)
  } catch (firstError) {
    const retryReply = await callClaude({
      ...options,
      content: [
        ...options.content,
        {
          type: 'text',
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

function fileToContentBlock(fileType: string, base64Data: string): ContentBlock {
  if (fileType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } }
  }
  return {
    type: 'image',
    source: { type: 'base64', media_type: fileType as 'image/jpeg', data: base64Data },
  }
}

// ---------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------
export async function performOcr(fileType: string, base64Data: string): Promise<OcrResult> {
  return callClaudeForJson(
    {
      system:
        'You are a precise OCR engine. Transcribe every page of the provided document exactly as ' +
        'written, preserving reading order. Do not summarize, translate, or correct spelling. If a ' +
        'page has no legible text, use an empty string. Reply with ONLY JSON matching this shape: ' +
        '{"pages": [{"page_number": number, "text": string, "confidence": number between 0 and 1}], ' +
        '"overall_confidence": number between 0 and 1}. Confidence reflects how legible/certain the ' +
        'transcription is, not document quality.',
      content: [
        fileToContentBlock(fileType, base64Data),
        { type: 'text', text: 'Transcribe this document. Reply with only the JSON object.' },
      ],
      maxTokens: 8192,
    },
    OcrResultSchema,
  )
}

// ---------------------------------------------------------------------
// Classification + language detection
// ---------------------------------------------------------------------
export async function classifyDocument(ocrText: string): Promise<ClassificationResult> {
  return callClaudeForJson(
    {
      system:
        'Classify the document type and detect its language from the OCR text below. ' +
        'document_type must be exactly one of: invoice, contract, government_letter, ' +
        'university_document, employment_document, bank_document, insurance, tax, rental, ' +
        'utility_bill, appointment, certificate, receipt, subscription, other. ' +
        'language should be the language name in English (e.g. "English", "German"). ' +
        'Reply with ONLY JSON: {"document_type": string, "language": string, "confidence": number 0-1}.',
      content: [{ type: 'text', text: ocrText.slice(0, 20000) }],
      maxTokens: 512,
    },
    ClassificationResultSchema,
  )
}

// ---------------------------------------------------------------------
// Structured information extraction
// ---------------------------------------------------------------------
export async function extractInformation(ocrText: string): Promise<ExtractedData> {
  return callClaudeForJson(
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
      content: [{ type: 'text', text: ocrText.slice(0, 20000) }],
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
  return callClaudeForJson(
    {
      system:
        'Summarize the document for someone who has not read it. Base every answer strictly on the ' +
        'OCR text and extracted data provided — clearly separate facts stated in the document from any ' +
        'interpretation you add. If something is unknown, say so plainly instead of guessing. ' +
        'Reply with ONLY JSON: {"overview": string (2-3 sentences), "what_is_this": string, ' +
        '"who_sent_it": string, "what_it_means": string, "what_to_do": string, ' +
        '"has_deadline": boolean, "deadline_detail": string | null, ' +
        '"involves_money": boolean, "money_detail": string | null, "next_action": string}.',
      content: [
        {
          type: 'text',
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
  return callClaude({
    system:
      `Translate the given text into ${languageName}. Preserve meaning, tone, and structure. ` +
      'Reply with ONLY the translated text — no preamble, no explanation, no quotes around it.',
    content: [{ type: 'text', text: text.slice(0, 20000) }],
    maxTokens: 4096,
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

  return callClaude({
    system:
      'You answer questions about ONE specific document, using only the document context provided below. ' +
      'If the answer is not present in the context, reply exactly: "I couldn\'t find this information in ' +
      'the document." Do not guess, do not use outside knowledge about the sender/topic, and do not ' +
      'invent facts. Keep answers short and direct.\n\n' +
      `DOCUMENT CONTEXT:\n${documentContext.slice(0, 15000)}`,
    content: [
      {
        type: 'text',
        text: historyBlock ? `${historyBlock}\nUser: ${question}` : `User: ${question}`,
      },
    ],
    maxTokens: 1024,
  })
}
