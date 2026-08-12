import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

/**
 * Builds a Supabase client scoped to the calling user's own JWT (forwarded
 * from the Authorization header). Every query made with this client is
 * subject to the same RLS policies as the frontend — Edge Functions never
 * need the service_role key for reads/writes on the user's own data.
 */
export function getUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new HttpError(401, 'Missing Authorization header.')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new HttpError(500, 'Supabase environment is not configured.')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
}

export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) {
    throw new HttpError(401, 'Not authenticated.')
  }
  return data.user
}

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}


/**
 * For scheduled/system Edge Functions only (e.g. process-reminders): builds
 * a service-role client that bypasses RLS to act across all users, and
 * verifies the caller actually presented the service_role key rather than
 * a regular user's access token. The Supabase gateway's default JWT check
 * only confirms the token is validly signed for this project — any signed-in
 * user's token would pass that check too — so this extra role check is what
 * actually keeps this class of function locked to trusted server callers
 * (pg_cron/dashboard scheduler using the service_role secret).
 */
export function getServiceRoleClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'Missing Authorization header.')
  }

  const token = authHeader.slice('Bearer '.length)
  const payload = decodeJwtPayload(token)
  if (payload?.role !== 'service_role') {
    throw new HttpError(403, 'This function requires the service_role key.')
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, 'Supabase service-role environment is not configured.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

function decodeJwtPayload(token: string): { role?: string } | null {
  try {
    const [, payloadB64] = token.split('.')
    const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}
