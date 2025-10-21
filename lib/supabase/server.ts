import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Creates a Supabase client for server-side operations with user authentication.
 * Uses the anon key and respects Row Level Security (RLS).
 *
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Creates a Supabase admin client for server-side operations that bypass RLS.
 * Uses the service role key for elevated permissions.
 *
 * WARNING: This client bypasses Row Level Security. Use with caution and only
 * in secure server-side contexts (API routes, server actions).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[v0] Missing Supabase credentials:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
    throw new Error("Missing Supabase credentials. Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.")
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
