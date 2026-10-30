import { AsyncLocalStorage } from 'node:async_hooks'
import { getInternalServiceClient, HttpError } from './supabaseClient.ts'

// Async-local storage isolates concurrent requests in a reused Edge isolate.
const caller = new AsyncLocalStorage<string>()
export function withAiBudget<T>(userId: string, action: () => Promise<T>): Promise<T> {
  return caller.run(userId, action)
}
export async function reserveCredits(credits: number): Promise<string> {
  const userId = caller.getStore()
  if (!userId) throw new HttpError(500, 'Missing AI billing context.')
  const { data, error } = await getInternalServiceClient().rpc('reserve_ai_credits', {
    p_user_id: userId, p_credits: Math.ceil(credits),
  })
  if (error) throw new HttpError(error.message.includes('AI_LIMIT_REACHED') ? 429 : 503,
    error.message.includes('AI_LIMIT_REACHED') ? error.message : 'AI usage accounting is unavailable. Please try again later.')
  return data as string
}
export async function settleCredits(reservation: string, actual: number): Promise<void> {
  // If settlement fails, the original reservation remains charged (fail closed).
  const { error } = await getInternalServiceClient().rpc('settle_ai_credits', {
    p_reservation: reservation, p_actual: Math.ceil(actual),
  })
  if (error) console.error('AI usage settlement failed; reservation retained.')
}
