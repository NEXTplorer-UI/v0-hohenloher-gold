-- Optional: Reset stock_quantity to 0 for all gram-based products
-- This cleans up the negative values that accumulated from the old trigger logic

UPDATE products 
SET stock_quantity = 0 
WHERE inventory_raw_id IS NOT NULL;

-- Refresh the materialized view to reflect the changes
REFRESH view product_availability;
