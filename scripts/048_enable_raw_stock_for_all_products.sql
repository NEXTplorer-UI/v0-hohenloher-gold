-- Enable raw stock management for all existing products
UPDATE products 
SET is_raw_stock_managed = true 
WHERE is_raw_stock_managed = false OR is_raw_stock_managed IS NULL;

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % products to use raw stock management', updated_count;
END $$;
