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

  console.log("[v0] AuthProvider render - loading:", loading, "user:", user?.email ?? "null")

  useEffect(() => {
    console.log("[v0] AuthProvider useEffect - mounting, calling getBrowserClient")
    let supabase: ReturnType<typeof getBrowserClient>
    try {
      supabase = getBrowserClient()
      console.log("[v0] AuthProvider - supabase client created successfully")
    } catch (err) {
      console.error("[v0] AuthProvider - ERROR creating supabase client:", err)
      setLoading(false)
      return
    }

    // Get initial session
    console.log("[v0] AuthProvider - calling getUser()")
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      console.log("[v0] AuthProvider - getUser result:", user?.email ?? "null", "error:", error?.message ?? "none")
      setUser(user)
      setLoading(false)
    }).catch((err) => {
      console.error("[v0] AuthProvider - getUser() EXCEPTION:", err)
      setLoading(false)
    })

    // Listen for auth changes
    console.log("[v0] AuthProvider - setting up onAuthStateChange listener")
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[v0] AuthProvider - onAuthStateChange event:", _event, "user:", session?.user?.email ?? "null")
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Cleanup: unsubscribe when component unmounts
    return () => {
      console.log("[v0] AuthProvider - unmounting, unsubscribing")
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
