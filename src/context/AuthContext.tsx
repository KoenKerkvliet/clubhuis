import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

interface SignUpParams {
  email: string
  password: string
  username: string
  displayName: string
}

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  /** True nadat de gebruiker via een herstel-link binnenkomt: dan eerst een nieuw wachtwoord kiezen. */
  recoveryMode: boolean
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  completePasswordReset: (password: string) => Promise<{ error: string | null }>
}

/** Waar de herstel-link naartoe terugstuurt; moet overeenkomen met de edge function-allowlist. */
export const RESET_REDIRECT_URL = `${window.location.origin}${import.meta.env.BASE_URL}`

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [recoveryMode, setRecoveryMode] = useState(false)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
      if (event === 'SIGNED_OUT') setRecoveryMode(false)

      setSession(nextSession)
      if (nextSession) {
        loadProfile(nextSession.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      recoveryMode,
      async signUp({ email, password, username, displayName }) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username.toLowerCase(), display_name: displayName },
            emailRedirectTo: RESET_REDIRECT_URL,
          },
        })
        return { error: error?.message ?? null }
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      },
      async signOut() {
        await supabase.auth.signOut()
      },
      async refreshProfile() {
        if (session) await loadProfile(session.user.id)
      },
      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: RESET_REDIRECT_URL,
        })
        return { error: error?.message ?? null }
      },
      async completePasswordReset(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (!error) setRecoveryMode(false)
        return { error: error?.message ?? null }
      },
    }),
    [session, profile, loading, recoveryMode],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth moet binnen AuthProvider gebruikt worden')
  return ctx
}
