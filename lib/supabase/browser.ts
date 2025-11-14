"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Extend globalThis to include our Supabase browser client cache
declare global {
  // eslint-disable-next-line no-var
  var __supabase_browser__: SupabaseClient | undefined
}

/**
 * Gets or creates a singleton Supabase client for browser-side operations.
 * Uses the anon key and respects Row Level Security (RLS).
 *
 * This client is cached globally and reused across all components to prevent
 * multiple GoTrueClient instances from being created.
 *
 * @returns Supabase browser client
 */
export function getBrowserClient(): SupabaseClient {
  console.log("[v0] [getBrowserClient] Called, cached:", !!globalThis.__supabase_browser__)

  // Return cached client if it exists
  if (globalThis.__supabase_browser__) {
    console.log("[v0] [getBrowserClient] Returning cached client")
    return globalThis.__supabase_browser__
  }

  console.log("[v0] [getBrowserClient] Creating NEW browser client")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // Create new browser client with full auth configuration
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })

  // Cache the client globally
  globalThis.__supabase_browser__ = client
  console.log("[v0] [getBrowserClient] Client cached globally")

  return client
}

/**
 * @deprecated Use getBrowserClient() instead
 */
export const createClient = getBrowserClient
