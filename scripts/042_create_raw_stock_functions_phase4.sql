-- ====================================
-- Phase 4: Helper Functions for Admin UI
-- ====================================

-- Function: Get raw stock overview with product details
CREATE OR REPLACE FUNCTION get_raw_stock_overview()
RETURNS TABLE (
  id BIGINT,
  product_group TEXT,
  stock_grams INTEGER,
  min_stock_grams INTEGER,
  unit_type TEXT,
  product_count BIGINT,
  product_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    irs.id,
    irs.product_group,
    irs.stock_grams,
    irs.min_stock_grams,
    irs.unit_type,
    COUNT(p.id) as product_count,
    ARRAY_AGG(p.name || ' (' || p.unit || ')' ORDER BY p.name) as product_names
  FROM inventory_raw_stock irs
  LEFT JOIN products p ON p.inventory_raw_id = irs.id AND p.is_raw_stock_managed = TRUE
  GROUP BY irs.id, irs.product_group, irs.stock_grams, irs.min_stock_grams, irs.unit_type
  ORDER BY irs.product_group;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_raw_stock_overview() TO authenticated;

-- Function: Update raw stock grams (with validation)
CREATE OR REPLACE FUNCTION update_raw_stock_grams(
  raw_id BIGINT,
  grams_delta INTEGER
)
RETURNS VOID AS $$
DECLARE
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT stock_grams INTO current_stock
  FROM inventory_raw_stock
  WHERE id = raw_id;
  
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Raw stock with id % not found', raw_id;
  END IF;
  
  -- Calculate new stock
  new_stock := current_stock + grams_delta;
  
  -- Allow negative stock (for pre-orders)
  -- But log warning if significantly negative
  IF new_stock < -10000 THEN
    RAISE WARNING 'Raw stock % is significantly negative: % grams', raw_id, new_stock;
  END IF;
  
  -- Update stock
  UPDATE inventory_raw_stock
  SET 
    stock_grams = new_stock,
    updated_at = NOW()
  WHERE id = raw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION update_raw_stock_grams(BIGINT, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_raw_stock_overview() IS 'Returns overview of all raw stocks with product details for admin UI';
COMMENT ON FUNCTION update_raw_stock_grams(BIGINT, INTEGER) IS 'Updates raw stock by delta (positive = add, negative = subtract)';
