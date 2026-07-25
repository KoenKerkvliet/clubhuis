import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { FunctionsHttpError } from '@supabase/supabase-js'
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
  resendVerification: (email: string) => Promise<{ error: string | null }>
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>
  completePasswordReset: (password: string) => Promise<{ error: string | null }>
}

/** Waar de bevestigings-/herstel-link naartoe terugstuurt na het klikken. */
export const RESET_REDIRECT_URL = `${window.location.origin}${import.meta.env.BASE_URL}`

const AuthContext = createContext<AuthContextValue | null>(null)

/** Roept een edge function aan en pakt bij een foutstatus de eigen {error} uit de body. */
async function invokeEdgeFunction(name: string, body: Record<string, unknown>): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke(name, { body })
  if (!error) return { error: null }

  const context = (error as FunctionsHttpError).context
  if (context instanceof Response) {
    try {
      const parsed = await context.clone().json()
      if (parsed?.error) return { error: parsed.error as string }
    } catch {
      // val terug op de generieke foutmelding hieronder
    }
  }
  return { error: error.message }
}

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
        return invokeEdgeFunction('send-verification-email', {
          email,
          password,
          username: username.toLowerCase(),
          display_name: displayName,
          redirectTo: RESET_REDIRECT_URL,
        })
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
      async resendVerification(email) {
        return invokeEdgeFunction('send-verification-email', { email, redirectTo: RESET_REDIRECT_URL })
      },
      async requestPasswordReset(email) {
        return invokeEdgeFunction('send-password-reset-email', { email, redirectTo: RESET_REDIRECT_URL })
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
