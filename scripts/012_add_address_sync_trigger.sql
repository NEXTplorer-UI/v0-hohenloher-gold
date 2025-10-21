-- =====================================================
-- Migration: Add automatic address synchronization
-- =====================================================
-- This script adds a trigger that automatically populates
-- the 'address' field from normalized address components
-- (street, house_number, postal_code, city, country)

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS sync_customer_address_trigger ON customers;
DROP FUNCTION IF EXISTS sync_customer_address();

-- Create function to sync address field
CREATE OR REPLACE FUNCTION sync_customer_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Build address from normalized components
  -- Only include non-null parts
  NEW.address := TRIM(
    concat_ws(', ',
      NULLIF(TRIM(concat_ws(' ', NEW.street, NEW.house_number)), ''),
      NULLIF(TRIM(concat_ws(' ', NEW.postal_code, NEW.city)), ''),
      NULLIF(TRIM(NEW.country), '')
    )
  );
  
  -- If address is empty string, set to NULL
  IF NEW.address = '' THEN
    NEW.address := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before INSERT or UPDATE
CREATE TRIGGER sync_customer_address_trigger
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION sync_customer_address();

-- Update existing records to populate address field
-- This will sync all existing customers
UPDATE customers
SET 
  street = street,  -- Trigger the trigger by "updating" a field
  updated_at = NOW()
WHERE 
  address IS NULL 
  AND (street IS NOT NULL OR postal_code IS NOT NULL OR city IS NOT NULL);

-- Verify the migration
DO $$
DECLARE
  synced_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM customers;
  SELECT COUNT(*) INTO synced_count FROM customers WHERE address IS NOT NULL;
  
  RAISE NOTICE '✓ Address sync trigger installed successfully';
  RAISE NOTICE '✓ Synced % of % customer addresses', synced_count, total_count;
END $$;
