-- Phase 1: Make product_id, qty, and qty_grams nullable in inventory_movements
-- This allows raw stock movements without a specific product_id
-- and supports different movement types (product-based vs raw-stock-based)

-- Step 1: Make product_id nullable
ALTER TABLE inventory_movements 
ALTER COLUMN product_id DROP NOT NULL;

-- Make qty nullable (for raw stock movements)
-- Step 2: Make qty nullable (only needed for product-based movements)
ALTER TABLE inventory_movements 
ALTER COLUMN qty DROP NOT NULL;

-- Make qty_grams nullable (for regular product movements)
-- Step 3: Make qty_grams nullable (only needed for raw-stock-based movements)
ALTER TABLE inventory_movements 
ALTER COLUMN qty_grams DROP NOT NULL;

-- Step 4: Add constraint to ensure either product_id OR inventory_raw_id is set
ALTER TABLE inventory_movements
ADD CONSTRAINT either_product_or_raw_stock
CHECK (
  (product_id IS NOT NULL AND inventory_raw_id IS NULL AND qty IS NOT NULL) OR
  (product_id IS NULL AND inventory_raw_id IS NOT NULL AND qty_grams IS NOT NULL)
);

-- Step 5: Create index for faster queries on inventory_raw_id
CREATE INDEX IF NOT EXISTS idx_inventory_movements_raw_id 
ON inventory_movements(inventory_raw_id) 
WHERE inventory_raw_id IS NOT NULL;

-- Add helpful comment
COMMENT ON CONSTRAINT either_product_or_raw_stock ON inventory_movements IS 
  'Ensures that an inventory movement belongs to either a specific product (with qty) or a raw stock group (with qty_grams), but not both';
