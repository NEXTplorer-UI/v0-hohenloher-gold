-- ====================================
-- Fix: Remove duplicate stock update in update_raw_stock_grams
-- ====================================
-- The trigger 'trigger_update_raw_stock_on_movement' already updates the stock
-- when a movement is inserted into inventory_movements.
-- The RPC function should only create the movement entry, not update stock directly.

DROP FUNCTION IF EXISTS update_raw_stock_grams(BIGINT, INTEGER);

CREATE OR REPLACE FUNCTION update_raw_stock_grams(
  raw_id BIGINT,
  grams_delta INTEGER
)
RETURNS VOID AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Get current stock for validation
  SELECT stock_grams INTO current_stock
  FROM inventory_raw_stock
  WHERE id = raw_id;
  
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Raw stock with id % not found', raw_id;
  END IF;
  
  -- Calculate new stock for validation/warning
  new_stock := current_stock + grams_delta;
  
  -- Allow negative stock (for pre-orders)
  -- But log warning if significantly negative
  IF new_stock < -10000 THEN
    RAISE WARNING 'Raw stock % will be significantly negative: % grams', raw_id, new_stock;
  END IF;
  
  -- Removed direct stock update - the trigger handles this
  -- The trigger 'trigger_update_raw_stock_on_movement' will update the stock
  -- automatically when the movement entry is created in the calling code
  
  -- Note: The stock update now happens via the trigger when inventory_movements is inserted
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_raw_stock_grams(BIGINT, INTEGER) TO authenticated;

COMMENT ON FUNCTION update_raw_stock_grams(BIGINT, INTEGER) IS 'Validates raw stock update. Actual update happens via trigger when movement is created.';
