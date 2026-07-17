import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = loading
  const [profile, setProfile]   = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    // Grab initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchProfile(data.session.user.id)
      else setProfileLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    setProfileLoading(true)
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

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, towns(*)')
        .eq('id', userId)
        .single()
      if (error) console.error('Profile fetch error:', error)
      setProfile(data ?? null)
    } catch (err) {
      console.error('Profile fetch failed:', err)
      setProfile(null)
    } finally {
      // Always clear, even on failure — otherwise the app hangs on the splash.
      setProfileLoading(false)
    }
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

  // Sign-out intentionally removed — to be rebuilt cleanly.
  function signOut() {
    console.warn('signOut not implemented yet')
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

  // Supabase sends a confirmation link to the NEW address. The change only
  // takes effect once that link is clicked — the old email keeps working
  // until then, which is the safe behaviour (a typo can't lock you out).
  async function updateEmail(newEmail) {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: window.location.origin }
    )
    return { error }
  }

  // Supabase's updateUser doesn't require the current password, which means a
  // hijacked open session could silently change it. Re-authenticating first
  // closes that hole.
  async function updatePassword({ currentPassword, newPassword }) {
    const email = session?.user?.email
    if (!email) return { error: { message: 'No email on this account.' } }

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (authErr) return { error: { message: 'That current password is incorrect.' } }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  // 'google' for OAuth users, 'email' for password accounts. Google users have
  // no password to change — they manage it with Google.
  const authProvider = session?.user?.app_metadata?.provider || 'email'

  const loading = session === undefined || (session !== null && profileLoading)

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
      updateEmail,
      updatePassword,
      authProvider,
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
