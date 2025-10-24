-- ============================================================================
-- Create RPC function to check if email exists in auth.users
-- ============================================================================
-- This function allows checking auth.users without PostgREST schema issues
-- or Supabase Admin API version compatibility problems
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.auth_email_exists(text);

-- Create the function with SECURITY DEFINER to access auth schema
CREATE OR REPLACE FUNCTION public.auth_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_exists boolean;
BEGIN
  -- Check if email exists in auth.users table
  SELECT EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE email = p_email
  ) INTO v_exists;
  
  RETURN v_exists;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but return false instead of crashing
    RAISE WARNING 'Error checking auth email: %', SQLERRM;
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.auth_email_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_email_exists(text) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.auth_email_exists(text) IS 
  'Checks if an email exists in auth.users table. Returns true if exists, false otherwise. Uses SECURITY DEFINER to access auth schema.';

-- ============================================================================
-- Verification (optional - comment out after running)
-- ============================================================================

-- Test the function with a known email
-- SELECT public.auth_email_exists('test@example.com');

-- ============================================================================
-- Notes:
-- ============================================================================
-- - SECURITY DEFINER allows the function to access auth.users
-- - The function is owned by the database owner (usually postgres)
-- - This bypasses PostgREST schema restrictions
-- - This avoids Supabase Admin API version compatibility issues
-- - The function is safe to call from client-side code via RPC
-- ============================================================================
