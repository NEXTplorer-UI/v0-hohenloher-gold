import type { SupabaseClient } from "@supabase/supabase-js"
import { getBrowserClient } from "./browser"

let client: SupabaseClient | undefined

/**
 * Re-exports browser client functions for backward compatibility.
 * Many components import from this file, so we maintain it as an alias.
 *
 * @deprecated Import from @/lib/supabase/browser instead
 */
export const createClient = getBrowserClient

export const createBrowserClient = getBrowserClient
