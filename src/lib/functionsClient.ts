import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Invokes a Supabase Edge Function and surfaces the *actual* server-side
 * error message. supabase-js's default `error.message` for a non-2xx
 * response is just the generic "Edge Function returned a non-2xx status
 * code" — the real message our functions send back (via jsonResponse in
 * supabase/functions/_shared/cors.ts) is on the response body, which has to
 * be read separately from `error.context`.
 */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const responseBody = await error.context.json().catch(() => null)
      throw new Error(responseBody?.error || error.message)
    }
    throw new Error(error.message || 'Edge Function request failed.')
  }
  if (data?.error) {
    throw new Error(data.error)
  }
  return data as T
}
