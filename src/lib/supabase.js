import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env.local and fill in your keys.'
  )
}

// Stock configuration. persistSession, autoRefreshToken and detectSessionInUrl
// are all on by default, and the session is stored in localStorage under
// `sb-<project-ref>-auth-token`. Don't override storageKey — changing it
// orphans every session that was written under the previous key.
export const supabase = createClient(supabaseUrl, supabaseKey)
