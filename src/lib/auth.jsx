import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, fullName, hourlyRate) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) return { error }
    // Profile + flag library + default goals are auto-created by the database trigger.
    // We just need to update the rate the user typed in signup.
    if (data.user && hourlyRate) {
      // Try right away; trigger may not have committed yet, so we retry once after a short delay.
      const rate = parseFloat(hourlyRate) || 0
      const update = async () => await supabase.from('profiles').update({ hourly_rate: rate, full_name: fullName }).eq('id', data.user.id)
      const first = await update()
      if (first.error) {
        await new Promise(r => setTimeout(r, 500))
        await update()
      }
    }
    return { data }
  }

  const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signInWithGoogle = async () => {
    return await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
