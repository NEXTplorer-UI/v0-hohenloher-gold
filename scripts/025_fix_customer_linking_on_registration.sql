-- Fix customer linking when user registers
-- This ensures that existing guest orders are automatically linked to the registered user

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with improved logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_customer_id UUID;
BEGIN
  -- Create profile record
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', NULL),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  -- Check if a customer record already exists with this email (but no user_id)
  SELECT id INTO existing_customer_id
  FROM public.customers
  WHERE email = NEW.email AND user_id IS NULL
  LIMIT 1;

  IF existing_customer_id IS NOT NULL THEN
    -- Update the existing customer record to link it to the new user
    UPDATE public.customers
    SET 
      user_id = NEW.id,
      first_name = COALESCE(NEW.raw_user_meta_data ->> 'first_name', first_name),
      last_name = COALESCE(NEW.raw_user_meta_data ->> 'last_name', last_name),
      phone = COALESCE(NEW.raw_user_meta_data ->> 'phone', phone),
      address = COALESCE(NEW.raw_user_meta_data ->> 'address', address),
      city = COALESCE(NEW.raw_user_meta_data ->> 'city', city),
      postal_code = COALESCE(NEW.raw_user_meta_data ->> 'postal_code', postal_code),
      updated_at = NOW()
    WHERE id = existing_customer_id;
    
    RAISE NOTICE 'Linked existing customer % to user %', existing_customer_id, NEW.id;
  ELSE
    -- Create a new customer record
    INSERT INTO public.customers (user_id, email, first_name, last_name, phone, address, city, postal_code)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'first_name', NULL),
      COALESCE(NEW.raw_user_meta_data ->> 'last_name', NULL),
      COALESCE(NEW.raw_user_meta_data ->> 'phone', NULL),
      COALESCE(NEW.raw_user_meta_data ->> 'address', NULL),
      COALESCE(NEW.raw_user_meta_data ->> 'city', NULL),
      COALESCE(NEW.raw_user_meta_data ->> 'postal_code', NULL)
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Created new customer for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates or links customer record when a new user signs up. If a customer with the same email already exists (from guest orders), it links that customer to the new user instead of creating a duplicate.';
