import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example → .env.local and fill in your keys.'
  )
}

// The session was never being written to storage: Object.keys(localStorage) came
// back EMPTY while signed in, meaning the client was holding the session in
// memory only. That one fault explains a whole cluster of symptoms:
//   - sign out appeared to do nothing (no stored token to remove, and the
//     in-memory session survived the re-render)
//   - the app asked for your home town on every visit (nothing persisted)
//   - iOS behaved differently again, since each context had its own memory
// So configure storage explicitly instead of relying on defaults.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'homespot-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,   // required for the Google OAuth redirect
  },
})
