-- Create admin user accounts
-- This script creates two admin users with their credentials

-- Admin 1: Suedfruechte-Hohenlohe@outlook.de
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'Suedfruechte-Hohenlohe@outlook.de',
  crypt('Orangenadmin', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('Orangenadmin', gen_salt('bf')),
  email_confirmed_at = now(),
  confirmed_at = now(),
  updated_at = now();

-- Create identity for Admin 1
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'Suedfruechte-Hohenlohe@outlook.de'),
  (SELECT id FROM auth.users WHERE email = 'Suedfruechte-Hohenlohe@outlook.de')::text,
  format('{"sub":"%s","email":"%s"}', 
    (SELECT id FROM auth.users WHERE email = 'Suedfruechte-Hohenlohe@outlook.de')::text, 
    'Suedfruechte-Hohenlohe@outlook.de'
  )::jsonb,
  'email',
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create customer entry for Admin 1
INSERT INTO public.customers (
  id,
  email,
  first_name,
  last_name,
  category,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Suedfruechte-Hohenlohe@outlook.de',
  'Admin',
  'Südfruechte Hohenlohe',
  'Admin',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  first_name = 'Admin',
  last_name = 'Südfruechte Hohenlohe',
  category = 'Admin',
  updated_at = now();

-- Admin 2: kontakt@stimmeundstruktur.de
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'kontakt@stimmeundstruktur.de',
  crypt('Orangenadmin', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  ''
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('Orangenadmin', gen_salt('bf')),
  email_confirmed_at = now(),
  confirmed_at = now(),
  updated_at = now();

-- Create identity for Admin 2
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'kontakt@stimmeundstruktur.de'),
  (SELECT id FROM auth.users WHERE email = 'kontakt@stimmeundstruktur.de')::text,
  format('{"sub":"%s","email":"%s"}', 
    (SELECT id FROM auth.users WHERE email = 'kontakt@stimmeundstruktur.de')::text, 
    'kontakt@stimmeundstruktur.de'
  )::jsonb,
  'email',
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

-- Create customer entry for Admin 2
INSERT INTO public.customers (
  id,
  email,
  first_name,
  last_name,
  category,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'kontakt@stimmeundstruktur.de',
  'Admin',
  'Stimme und Struktur',
  'Admin',
  now(),
  now()
) ON CONFLICT (email) DO UPDATE SET
  first_name = 'Admin',
  last_name = 'Stimme und Struktur',
  category = 'Admin',
  updated_at = now();

-- Confirm both admin accounts were created
SELECT 
  'Admin accounts created successfully' as message,
  email,
  created_at
FROM auth.users 
WHERE email IN ('Suedfruechte-Hohenlohe@outlook.de', 'kontakt@stimmeundstruktur.de')
ORDER BY email;
