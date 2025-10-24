import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { AuthenticationError, AuthorizationError } from "@/lib/errors/api-errors"

/**
 * Check if the current user is authenticated
 * Returns user data if authenticated, null otherwise
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Check if the current user is an admin
 * Returns true if admin, false otherwise
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    return false
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    },
  )

  const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()

  // If there's an error or no profile, user is not admin
  if (error) {
    console.error("[v0] Error fetching profile:", error)
    return false
  }

  if (!profile) {
    console.warn("[v0] No profile found for user:", user.id)
    return false
  }

  return profile.role === "admin"
}

/**
 * Middleware to require authentication
 * Throws AuthenticationError if not authenticated
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    throw new AuthenticationError()
  }

  return { user }
}

/**
 * Middleware to require admin role
 * Throws AuthenticationError if not authenticated, AuthorizationError if not admin
 */
export async function requireAdmin(request: NextRequest) {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    throw new AuthenticationError()
  }

  const isAdminUser = await isAdmin(request)

  if (!isAdminUser) {
    throw new AuthorizationError()
  }

  return { user }
}
