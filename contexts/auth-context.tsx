"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { getBrowserClient } from "@/lib/supabase/browser"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface AuthContextType {
  user: SupabaseUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getBrowserClient()

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Cleanup: unsubscribe when component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, []) // Empty dependency array - only run once on mount

  const signOut = async () => {
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
