import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getUserClient, requireUser, HttpError } from '../_shared/supabaseClient.ts'
import { getCallerEntitlements } from '../_shared/entitlements.ts'
import { withAiBudget } from '../_shared/aiBudget.ts'
import { generateEmbedding } from '../_shared/embeddingProvider.ts'
Deno.serve(async req => {
  const cors = handleCors(req)
  if (cors) return cors
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  try {
    const client = getUserClient(req)
    const user = await requireUser(client)
    const body = await req.json()
    const ownerId = typeof body.ownerId === 'string' ? body.ownerId : user.id
    const query = typeof body.query === 'string' ? body.query.trim() : ''
    if (!query || query.length > 1000) throw new HttpError(400, 'Enter a search of 1–1,000 characters.')
    const { data: allowed } = await client.rpc('can_workspace', { p_owner: ownerId, p_write: false })
    if (!allowed) throw new HttpError(403, 'Workspace access denied.')
    const plan = await getCallerEntitlements(client, ownerId)
    if (!['pro','enterprise'].includes(plan.tier)) throw new HttpError(403, 'Smart search requires Pro or Business.')
    const embedding = await withAiBudget(ownerId, () => generateEmbedding(query, 'RETRIEVAL_QUERY'))
    const { data, error } = await client.rpc('search_document_embeddings', { p_owner: ownerId, p_embedding: JSON.stringify(embedding), p_limit: 10 })
    if (error) throw new HttpError(500, error.message)
    return jsonResponse({ results: data })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Search failed.' }, error instanceof HttpError ? error.status : 500)
  }
})
