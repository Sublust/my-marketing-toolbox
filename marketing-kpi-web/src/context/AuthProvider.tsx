import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

export type AppRole = 'admin' | 'pm' | 'specialist'

export type UserProfile = {
  id: string
  full_name: string
  role: AppRole
}

type AuthState = {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  isLoading: boolean
  signInWithPassword: (params: {
    email: string
    password: string
  }) => Promise<{ errorMessage?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as UserProfile | null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null)
      return
    }
    try {
      const p = await fetchProfile(user.id)
      setProfile(p)
    } catch {
      // If profile isn't present yet (common right after signup),
      // keep session but show limited UI until admin creates profile.
      setProfile(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      setIsLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!isMounted) return

      const s = data.session ?? null
      setSession(s)
      setUser(s?.user ?? null)
      setIsLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })

    return () => {
      isMounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    void refreshProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      signInWithPassword: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) return { errorMessage: error.message }
        return {}
      },
      signOut: async () => {
        await supabase.auth.signOut()
      },
      refreshProfile,
    }),
    [session, user, profile, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

