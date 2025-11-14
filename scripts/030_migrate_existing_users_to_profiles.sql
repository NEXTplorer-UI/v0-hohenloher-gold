-- Migration: Create profiles for all existing users
-- This script creates profile entries for users who don't have one yet
-- and links them based on their email address

-- Create profiles for all existing auth.users who don't have a profile
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  -- Set admin role for specific email addresses, customer for all others
  CASE 
    WHEN u.email IN ('finkmaxi@gmail.com', 'admin@hohenloher-gold.de') THEN 'admin'
    ELSE 'customer'
  END as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- Log the number of profiles created
DO $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  RAISE NOTICE 'Total profiles after migration: %', profile_count;
END $$;
