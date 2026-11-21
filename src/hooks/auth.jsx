import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { configured, db, startDemo, stopDemo } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [state, setState] = useState({ booting: configured, session: null, demo: false, recovery: false, bootError: '' })

  useEffect(() => {
    if (!configured) return undefined
    let live = true
    db()
      .auth.getSession()
      .then(({ data, error }) => {
        if (!live) return
        setState((s) => ({ ...s, booting: false, session: data?.session || null, bootError: error?.message || '' }))
      })
      .catch((e) => live && setState((s) => ({ ...s, booting: false, bootError: e.message })))
    const { data } = db().auth.onAuthStateChange((event, session) => {
      if (!live) return
      if (event === 'SIGNED_OUT') queryClient.clear() // never leak cached data to the next account
      setState((s) => ({ ...s, session, recovery: event === 'PASSWORD_RECOVERY' ? true : s.recovery }))
    })
    return () => {
      live = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const enterDemo = useCallback(async () => {
    const client = await startDemo()
    const { data } = await client.auth.getSession()
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        stopDemo()
        queryClient.clear()
        setState((s) => ({ ...s, session: null, demo: false }))
      } else {
        setState((s) => ({ ...s, session }))
      }
    })
    setState((s) => ({ ...s, booting: false, session: data.session, demo: true }))
  }, [queryClient])

  const clearRecovery = useCallback(() => setState((s) => ({ ...s, recovery: false })), [])

  const value = useMemo(
    () => ({ ...state, user: state.session?.user || null, enterDemo, clearRecovery }),
    [state, enterDemo, clearRecovery],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

export function displayNameOf(user) {
  return user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'You'
}
