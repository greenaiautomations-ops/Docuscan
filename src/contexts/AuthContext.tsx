import { createContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { getProfile } from '../services/profileService'
import { computeEntitlements, type Entitlements } from '../utils/entitlements'
import { activityKey, isInactive, INACTIVITY_TIMEOUT_MS } from '../utils/inactivity'
import type { Profile } from '../types/document'

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  entitlements: Entitlements
  loading: boolean
  refreshProfile: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const signingIn = useRef(false)
  const currentUser = useRef<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    try {
      const p = await getProfile(userId)
      if (currentUser.current === userId) setProfile(p)
    } catch {
      if (currentUser.current === userId) setProfile(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    const acceptSession = (newSession: Session | null) => {
      if (!isMounted) return
      const userId = newSession?.user.id
      if (userId) {
        const key = activityKey(userId)
        const previous = localStorage.getItem(key)
        if (signingIn.current || previous === null) localStorage.setItem(key, String(Date.now()))
        else if (isInactive(Number(previous))) {
          currentUser.current = null
          setSession(null)
          setProfile(null)
          setLoading(false)
          sessionStorage.setItem('docvault:session-expired', 'true')
          // Defer Supabase calls outside the auth event callback's lock.
          setTimeout(() => { void supabase.auth.signOut({ scope: 'local' }) }, 0)
          return
        }
      }
      currentUser.current = userId ?? null
      setSession(newSession)
      if (userId) void loadProfile(userId).finally(() => { if (isMounted) setLoading(false) })
      else { setProfile(null); setLoading(false) }
    }
    // INITIAL_SESSION also covers restoring a session; using one source avoids
    // racing getSession against a later SIGNED_OUT event.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      acceptSession(newSession)
    })

    return () => {
      isMounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const sessionUserId = session?.user.id
  // Persist activity across reloads and share it between tabs. Token refresh is
  // deliberately not activity. Check expiry before accepting a new interaction.
  useEffect(() => {
    if (!sessionUserId) return
    const key = activityKey(sessionUserId)
    let last = Number(localStorage.getItem(key)) || Date.now()
    localStorage.setItem(key, String(last))
    let expired = false
    let timer: ReturnType<typeof setTimeout>
    const check = () => {
      last = Number(localStorage.getItem(key)) || last
      if (isInactive(last)) {
        if (expired) return
        expired = true
        sessionStorage.setItem('docvault:session-expired', 'true')
        currentUser.current = null
        setSession(null)
        setProfile(null)
        // Clear local credentials even when revocation cannot reach the server.
        void supabase.auth.signOut({ scope: 'local' }).then(({ error }) => {
          if (error) window.location.replace('/login?expired=1')
        })
        return
      }
      clearTimeout(timer)
      timer = setTimeout(check, Math.max(1, INACTIVITY_TIMEOUT_MS - (Date.now() - last)))
    }
    const activity = () => {
      check()
      if (expired || document.visibilityState === 'hidden') return
      if (Date.now() - last < 1000) return
      last = Date.now()
      localStorage.setItem(key, String(last))
      check()
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const
    events.forEach(event => window.addEventListener(event, activity, { passive: true }))
    window.addEventListener('storage', check)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    check()
    return () => {
      clearTimeout(timer)
      events.forEach(event => window.removeEventListener(event, activity))
      window.removeEventListener('storage', check)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [sessionUserId])

  const entitlements = useMemo(
    () =>
      computeEntitlements({
        role: profile?.role ?? 'user',
        subscription_tier: profile?.subscription_tier ?? 'free',
        subscription_status: profile?.subscription_status ?? 'active',
        is_comp_access: profile?.is_comp_access ?? false,
      }),
    [profile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      entitlements,
      loading,
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id)
      },
      signUp: async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) throw error
      },
      signIn: async (email: string, password: string) => {
        signingIn.current = true
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
          sessionStorage.removeItem('docvault:session-expired')
        } finally { signingIn.current = false }

      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) throw error
      },
    }),
    [session, profile, entitlements, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
