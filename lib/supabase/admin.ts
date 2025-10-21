/**
 * Re-exports Supabase client functions for backward compatibility.
 * Many API routes import from this file, so we maintain it as an alias.
 */
export { createClient, createAdminClient } from "./server"
