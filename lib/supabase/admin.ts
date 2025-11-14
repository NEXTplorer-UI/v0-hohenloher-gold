import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

// Extend globalThis to include our Supabase admin client cache
declare global {
  // eslint-disable-next-line no-var
  var __supabase_admin__: SupabaseClient | undefined
}

/**
 * Gets or creates a singleton Supabase admin client for server-side operations.
 * Uses the service role key to bypass Row Level Security (RLS).
 *
 * This client is cached globally and reused across all requests to prevent
 * multiple GoTrueClient instances from being created.
 *
 * @returns Supabase admin client with service role permissions
 * @throws Error if required environment variables are missing
 */
export function getAdminClient(): SupabaseClient {
  // Return cached client if it exists (and we're not in dev with HMR)
  if (globalThis.__supabase_admin__) {
    return globalThis.__supabase_admin__
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase credentials. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
    )
  }

  // Create new admin client with minimal auth configuration
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Cache the client globally
  globalThis.__supabase_admin__ = client

  return client
}

/**
 * @deprecated Use getAdminClient() instead
 */
export const createAdminClient = getAdminClient
