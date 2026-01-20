-- Fix user_profiles references in database
-- This script creates a view that maps user_profiles to profiles table
-- to fix the "relation user_profiles does not exist" error

-- Option 1: Create a view that aliases profiles as user_profiles
CREATE OR REPLACE VIEW user_profiles AS
SELECT * FROM profiles;

-- Grant permissions on the view
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON user_profiles TO service_role;

-- Option 2: Find and fix any functions that reference user_profiles
-- (This will show us which functions need to be updated)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE pg_get_functiondef(p.oid) LIKE '%user_profiles%'
      AND n.nspname = 'public'
  LOOP
    RAISE NOTICE 'Function %.% references user_profiles', func_record.schema_name, func_record.function_name;
  END LOOP;
END $$;
