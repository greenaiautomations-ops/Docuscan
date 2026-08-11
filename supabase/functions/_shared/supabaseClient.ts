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
