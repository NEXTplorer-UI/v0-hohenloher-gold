-- Fix the trigger to only update stock_quantity for piece-based products
-- This prevents gram-based products from having negative stock_quantity values

CREATE OR REPLACE FUNCTION update_product_stock_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only update stock_quantity for piece-based products (no inventory_raw_id)
  -- Gram-based products use inventory_raw.stock_grams instead
  IF NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET stock_quantity = stock_quantity + NEW.qty
    WHERE id = NEW.product_id 
      AND inventory_raw_id IS NULL;  -- Only for piece-based products
  END IF;
  
  RETURN NEW;
END;
$$;

-- The trigger itself doesn't need to be recreated, just the function
