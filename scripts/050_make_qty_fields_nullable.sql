-- Migration: Make qty and qty_grams nullable in inventory_movements
-- Reason: Rohwarengruppen-Movements verwenden nur qty_grams, nicht qty
-- Date: 2025-01-XX

-- Step 1: Make qty nullable (for raw stock movements that only have qty_grams)
ALTER TABLE inventory_movements 
ALTER COLUMN qty DROP NOT NULL;

-- Step 2: Make qty_grams nullable (for product movements that only have qty)
ALTER TABLE inventory_movements 
ALTER COLUMN qty_grams DROP NOT NULL;

-- Step 3: Update existing constraint to include qty/qty_grams logic
-- First drop the old constraint if it exists
ALTER TABLE inventory_movements
DROP CONSTRAINT IF EXISTS either_product_or_raw_stock;

-- Step 4: Add new constraint that ensures data integrity
ALTER TABLE inventory_movements
ADD CONSTRAINT either_product_or_raw_stock_with_qty
CHECK (
  -- Case 1: Regular product movement (product_id set, qty set, no raw stock)
  (product_id IS NOT NULL AND qty IS NOT NULL AND inventory_raw_id IS NULL AND qty_grams IS NULL) 
  OR
  -- Case 2: Raw stock movement (inventory_raw_id set, qty_grams set, no product)
  (inventory_raw_id IS NOT NULL AND qty_grams IS NOT NULL AND product_id IS NULL AND qty IS NULL)
);

-- Verification query (optional - comment this out if not needed)
-- This shows the structure of movements after migration
-- SELECT 
--   CASE 
--     WHEN product_id IS NOT NULL THEN 'Product Movement'
--     WHEN inventory_raw_id IS NOT NULL THEN 'Raw Stock Movement'
--   END as movement_type,
--   COUNT(*) as count
-- FROM inventory_movements
-- GROUP BY 1;
