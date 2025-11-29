-- Fix inventory_movements_with_details view to support raw stock movements
-- Changes JOIN to LEFT JOIN so movements without product_id are included

CREATE OR REPLACE VIEW inventory_movements_with_details AS
SELECT 
  -- All existing inventory_movements columns
  im.id,
  im.product_id,
  im.order_id,
  im.order_item_id,
  im.qty,
  im.reason,
  im.reference_id,
  im.occurred_at,
  im.created_at,
  im.updated_at,
  im.created_by,
  im.source,
  p.name as product_name,
  p.sku as product_sku,
  p.price as product_price,
  p.unit as product_unit,
  c.name as category_name,
  COALESCE(
    CONCAT(pr.first_name, ' ', pr.last_name),
    pr.email,
    'System'
  ) as created_by_name,
  
  -- Raw stock columns
  im.inventory_raw_id,
  im.qty_grams,
  im.movement_type,
  irs.product_group as raw_product_group,
  irs.unit_type as raw_unit_type,
  
  -- Updated quantity_display to show raw stock name when no product
  CASE 
    WHEN im.movement_type = 'product' OR im.movement_type IS NULL THEN 
      COALESCE(im.qty::TEXT, '0') || ' Stück'
    WHEN im.movement_type = 'raw' AND irs.unit_type = 'weight' THEN 
      COALESCE(im.qty_grams::TEXT, '0') || ' g (' || ROUND(COALESCE(im.qty_grams, 0)/1000.0, 2) || ' kg)'
    WHEN im.movement_type = 'raw' AND irs.unit_type = 'volume' THEN 
      COALESCE(im.qty_grams::TEXT, '0') || ' ml (' || ROUND(COALESCE(im.qty_grams, 0)/1000.0, 2) || ' L)'
    ELSE COALESCE(im.qty::TEXT, '0') || ' Stück'
  END as quantity_display
  
FROM inventory_movements im
-- Changed to LEFT JOIN so raw stock movements without product_id are included
LEFT JOIN products p ON im.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN inventory_raw_stock irs ON im.inventory_raw_id = irs.id
LEFT JOIN profiles pr ON im.created_by = pr.id;

-- Keep grants as in original view
GRANT SELECT ON inventory_movements_with_details TO authenticated;
GRANT SELECT ON inventory_movements_with_details TO anon;

COMMENT ON VIEW inventory_movements_with_details IS 
  'Fixed: LEFT JOIN on products to include raw stock movements without product_id. Shows both product-based (pieces) and raw stock-based (grams) movements.';
