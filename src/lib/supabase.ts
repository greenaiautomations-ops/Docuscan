import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

// Remove credentials saved by older versions. Never restore a prior tab's login.
const legacyStorageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
try {
  for (const suffix of ['', '-code-verifier', '-user']) localStorage.removeItem(legacyStorageKey + suffix)
} catch { /* Storage may be disabled; memory-only auth still works. */ }

// Credentials live only in this page's memory. Closing/reloading/navigating away
// discards them, including browser session restore. SPA navigation retains login.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const DOCUMENTS_BUCKET = 'documents'

// A back/forward-cache restore can revive JS memory after navigating away.
// Reload that document to establish a fresh, signed-out client instead.
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.replace('/login')
})
