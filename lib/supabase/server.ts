import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getAdminClient, createAdminClient } from "./admin"

/**
 * Creates a Supabase client for server-side operations with user authentication.
 * Uses the anon key and respects Row Level Security (RLS).
 *
 * This client handles cookies for authentication and should be used for
 * user-specific operations that respect RLS policies.
 *
 * @returns Promise resolving to a Supabase client with user context
 */
export async function getServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}

/**
 * @alias getServerClient
 */
export const createServerClient = getServerClient

/**
 * @deprecated Use getServerClient() instead
 */
export const createClient = getServerClient

/**
 * Checks if the current authenticated user has admin role.
 * Returns the user if admin, throws error if not authenticated or not admin.
 */
export async function requireAdmin() {
  const supabase = await getServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("Unauthorized: Not authenticated")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    throw new Error("Unauthorized: Profile not found")
  }

  if (profile.role !== "admin") {
    throw new Error("Forbidden: Admin access required")
  }

  return user
}

/**
 * Checks if the current authenticated user is authenticated.
 * Returns the user if authenticated, throws error if not.
 */
export async function requireAuth() {
  const supabase = await getServerClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Unauthorized: Not authenticated")
  }

  return user
}

export { getAdminClient, createAdminClient }
