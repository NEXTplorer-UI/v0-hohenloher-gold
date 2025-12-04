-- Extend product_availability view to include unit information
-- This allows the API to correctly calculate availability for gram-based products

DROP VIEW IF EXISTS product_availability CASCADE;

CREATE VIEW product_availability AS
SELECT 
  p.id AS product_id,
  -- Added unit and weight_kg for proper quantity calculation
  p.unit AS unit_type,
  p.weight_kg,
  -- For piece-based products: use stock_quantity, for gram-based: use 0
  CASE 
    WHEN p.inventory_raw_id IS NULL THEN COALESCE(p.stock_quantity, 0)
    ELSE 0
  END AS piece_stock,
  
  -- For gram-based products: use inventory_raw_stock.stock_grams, for piece-based: use 0
  CASE 
    WHEN p.inventory_raw_id IS NOT NULL THEN COALESCE(irs.stock_grams, 0)
    ELSE 0
  END AS gram_stock,
  
  -- Calculate stock_status using dynamic thresholds from min_stock columns
  CASE 
    -- Gram-based products: check against min_stock_grams
    WHEN p.inventory_raw_id IS NOT NULL THEN
      CASE 
        WHEN COALESCE(irs.stock_grams, 0) > COALESCE(irs.min_stock_grams, 0) THEN 'in_stock'
        WHEN COALESCE(irs.stock_grams, 0) > 0 AND COALESCE(irs.stock_grams, 0) <= COALESCE(irs.min_stock_grams, 0) THEN 'low_stock'
        ELSE 'out_of_stock'
      END
    -- Piece-based products: check against min_stock
    ELSE
      CASE 
        WHEN COALESCE(p.stock_quantity, 0) > COALESCE(p.min_stock, 0) THEN 'in_stock'
        WHEN COALESCE(p.stock_quantity, 0) > 0 AND COALESCE(p.stock_quantity, 0) <= COALESCE(p.min_stock, 0) THEN 'low_stock'
        ELSE 'out_of_stock'
      END
  END AS stock_status
FROM products p
LEFT JOIN inventory_raw_stock irs ON irs.id = p.inventory_raw_id
WHERE p.is_active = true;

-- Grant access to all roles like the original view
GRANT SELECT ON product_availability TO anon;
GRANT SELECT ON product_availability TO authenticated;
GRANT SELECT ON product_availability TO service_role;
