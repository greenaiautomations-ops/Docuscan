import { fetchWithRetry } from './httpRetry.ts'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001'
const EMBEDDING_DIMENSIONS = 512 // matches document_embeddings.embedding vector(512)

/**
 * Generates an embedding vector for a chunk of text using Gemini's
 * embedding model (same GEMINI_API_KEY as OCR/AI — no separate provider or
 * signup needed). Embeddings are best-effort and optional in Phase 2
 * (architecture prep for Phase 3 semantic search) — if GEMINI_API_KEY isn't
 * configured, or the request fails, callers should treat a thrown error as
 * non-fatal and simply skip storing embeddings.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured; skipping embedding generation.')
  }

  const model = Deno.env.get('GEMINI_EMBEDDING_MODEL') || DEFAULT_EMBEDDING_MODEL
  const url = `${GEMINI_API_BASE}/${model}:embedContent`

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType: 'RETRIEVAL_DOCUMENT',
    }),
  }, 2) // fewer retries — embeddings are best-effort and non-fatal anyway

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Gemini embeddings error (${response.status}): ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  const embedding = data?.embedding?.values
  if (!Array.isArray(embedding)) {
    throw new Error('Gemini API returned no embedding.')
  }
  return embedding
}

/** Splits text into ~N-character chunks on paragraph/sentence boundaries where possible. */
export function chunkText(text: string, chunkSize = 3000, maxChunks = 5): string[] {
  const trimmed = text.trim()
  if (trimmed.length === 0) return []

  const chunks: string[] = []
  let start = 0
  while (start < trimmed.length && chunks.length < maxChunks) {
    let end = Math.min(start + chunkSize, trimmed.length)
    if (end < trimmed.length) {
      const breakPoint = trimmed.lastIndexOf('\n', end)
      if (breakPoint > start + chunkSize * 0.5) end = breakPoint
    }
    chunks.push(trimmed.slice(start, end).trim())
    start = end
  }
  return chunks.filter(Boolean)
}
