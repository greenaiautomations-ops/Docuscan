const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const EMBEDDING_MODEL = 'voyage-3-lite' // 512 dimensions — matches document_embeddings.embedding

/**
 * Generates an embedding vector for a chunk of text. Embeddings are
 * best-effort and optional in Phase 2 (architecture prep for Phase 3
 * semantic search) — if VOYAGE_API_KEY isn't configured, callers should
 * treat a thrown error as non-fatal and simply skip storing embeddings.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('VOYAGE_API_KEY')
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY is not configured; skipping embedding generation.')
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: [text.slice(0, 8000)],
      input_type: 'document',
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Voyage AI embeddings error (${response.status}): ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  const embedding = data?.data?.[0]?.embedding
  if (!Array.isArray(embedding)) {
    throw new Error('Voyage AI returned no embedding.')
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
