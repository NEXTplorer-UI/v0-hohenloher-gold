-- Create missing profiles for users who don't have one
-- This script creates profiles with 'admin' role for existing auth users

INSERT INTO profiles (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin' as role,  -- Set as admin by default, adjust as needed
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the profiles were created
SELECT 
  p.id,
  p.email,
  p.role,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10;
