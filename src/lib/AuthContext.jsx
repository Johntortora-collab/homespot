import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [profile, setProfile]   = useState(null)

  useEffect(() => {
    // Grab initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    // If we just landed back from a Google OAuth redirect with a pending
    // role (set by signInWithGoogle), apply it now — Google sign-in creates
    // a fresh profile with the schema's default role ('consumer'), so an
    // owner signing in via Google needs this corrected the first time.
    const params = new URLSearchParams(window.location.search)
    const pendingRole = params.get('pending_role')

    if (pendingRole && (pendingRole === 'owner' || pendingRole === 'consumer')) {
      await supabase.from('profiles').update({ role: pendingRole }).eq('id', userId)
      // Clean the query param out of the URL so it doesn't linger or reapply
      params.delete('pending_role')
      const cleanUrl = window.location.pathname + (params.toString() ? `?${params}` : '')
      window.history.replaceState({}, '', cleanUrl)
    }

    const { data } = await supabase
      .from('profiles')
      .select('*, towns(*)')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  async function signUp({ email, password, fullName, role = 'consumer' }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    })
    return { data, error }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signInWithGoogle(role = 'consumer') {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Carry the intended role through the redirect so we can apply it
        // once the OAuth flow completes and a profile row gets created.
        redirectTo: `${window.location.origin}/?pending_role=${role}`,
      },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select('*, towns(*)')
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  const loading = session === undefined

  return (
    <AuthContext.Provider value={{
      session,
      profile,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      refetchProfile: () => fetchProfile(session?.user?.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
