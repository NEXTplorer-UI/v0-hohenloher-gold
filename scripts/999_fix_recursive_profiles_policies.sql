-- Fix infinite recursion in profiles RLS policies
-- Remove duplicate and recursive policies

-- Drop the recursive policies that cause infinite loops
DROP POLICY IF EXISTS "admin read all profiles" ON profiles;
DROP POLICY IF EXISTS "admin update profiles" ON profiles;

-- Optional: Clean up duplicate policies (keeping the most descriptive ones)
-- These are functionally identical to "Users can view own profile" and "Users can update own profile"
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "read own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Verify remaining policies (this is just a comment for documentation)
-- After this script, the following policies should remain:
-- 1. "Users can view own profile" - Users can SELECT their own profile
-- 2. "Users can update own profile" - Users can UPDATE their own profile
-- 3. "Admins can view all profiles" - Admins can SELECT all profiles (uses is_admin())
-- 4. "Admins can update all profiles" - Admins can UPDATE all profiles (uses is_admin())
-- 5. "enable insert for authenticated users" - Users can INSERT their profile
-- 6. "insert own profile" - Users can INSERT their own profile
-- 7. "Service role can do everything" - Service role bypass (if exists)

-- These remaining policies should provide:
-- - No recursion (is_admin() function is safe)
-- - Admin access to all profiles
-- - User access to own profile only
