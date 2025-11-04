-- Migration: Convert TEXT date fields to DATE type
-- This ensures consistent date handling and proper database constraints

-- Step 1: Add new DATE columns
ALTER TABLE orders ADD COLUMN pickup_date_new DATE;
ALTER TABLE order_items ADD COLUMN expected_delivery_date_new DATE;

-- Step 2: Convert existing TEXT data to DATE
-- Handle various date formats and NULL values
UPDATE orders 
SET pickup_date_new = CASE 
  WHEN pickup_date IS NULL OR pickup_date = '' THEN NULL
  ELSE pickup_date::DATE
END;

UPDATE order_items 
SET expected_delivery_date_new = CASE 
  WHEN expected_delivery_date IS NULL OR expected_delivery_date = '' THEN NULL
  ELSE expected_delivery_date::DATE
END;

-- Step 3: Drop old TEXT columns
ALTER TABLE orders DROP COLUMN pickup_date;
ALTER TABLE order_items DROP COLUMN expected_delivery_date;

-- Step 4: Rename new columns to original names
ALTER TABLE orders RENAME COLUMN pickup_date_new TO pickup_date;
ALTER TABLE order_items RENAME COLUMN expected_delivery_date_new TO expected_delivery_date;

-- Step 5: Add helpful comments
COMMENT ON COLUMN orders.pickup_date IS 'Pickup/delivery date for the order (DATE type for consistent handling)';
COMMENT ON COLUMN order_items.expected_delivery_date IS 'Expected delivery date for this item (DATE type for consistent handling)';
