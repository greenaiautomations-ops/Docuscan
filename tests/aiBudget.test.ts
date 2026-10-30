import { beforeEach, describe, expect, it, vi } from 'vitest'
const { reserve, settle } = vi.hoisted(() => ({ reserve: vi.fn(), settle: vi.fn() }))
vi.mock('../supabase/functions/_shared/aiBudget.ts', () => ({ reserveCredits: reserve, settleCredits: settle }))
vi.mock('../supabase/functions/_shared/schemas.ts', () => ({
  ClassificationResultSchema: {}, ExtractedDataSchema: {}, OcrResultSchema: {}, SummaryResultSchema: {}, parseJsonWithSchema: vi.fn(),
}))
import { answerQuestion } from '../supabase/functions/_shared/geminiProvider'

describe('provider cost guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Deno', { env: { get: (key: string) => key === 'GEMINI_API_KEY' ? 'test-key' : undefined } })
    reserve.mockResolvedValue('reservation')
    settle.mockResolvedValue(undefined)
  })
  it('reserves multimodal input and maximum output before generating, then settles actual thinking/output', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ totalTokens: 100 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 10 }, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'answer' }] } }] })))
    vi.stubGlobal('fetch', fetch)
    expect(await answerQuestion('context', [], 'question')).toBe('answer')
    expect(reserve).toHaveBeenCalledWith(100 + 6 * 1024)
    expect(settle).toHaveBeenCalledWith('reservation', 280)
    expect(fetch.mock.invocationCallOrder[1]).toBeGreaterThan(reserve.mock.invocationCallOrder[0])
  })
  it('never generates when the monthly budget is exhausted', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ totalTokens: 100 })))
    vi.stubGlobal('fetch', fetch)
    reserve.mockRejectedValueOnce(new Error('AI_LIMIT_REACHED'))
    await expect(answerQuestion('context', [], 'question')).rejects.toThrow('AI_LIMIT_REACHED')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('fails closed if counting fails and retains reservation on ambiguous provider failure', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 }))
    vi.stubGlobal('fetch', fetch)
    await expect(answerQuestion('context', [], 'question')).rejects.toThrow('estimate')
    expect(reserve).not.toHaveBeenCalled()
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ totalTokens: 100 }))).mockRejectedValueOnce(new Error('network'))
    await expect(answerQuestion('context', [], 'question')).rejects.toThrow('network')
    expect(settle).not.toHaveBeenCalled()
  })
})
