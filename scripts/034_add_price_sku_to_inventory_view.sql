-- Add SKU and price to inventory movements view for better exports

DROP VIEW IF EXISTS inventory_movements_with_details;

CREATE OR REPLACE VIEW inventory_movements_with_details AS
SELECT 
    im.*,
    p.name as product_name,
    p.sku as product_sku,
    p.price as product_price,
    p.unit as product_unit,
    c.name as category_name,
    COALESCE(
        CONCAT(pr.first_name, ' ', pr.last_name),
        pr.email,
        'System'
    ) as created_by_name
FROM inventory_movements im
JOIN products p ON im.product_id = p.id
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN auth.users u ON im.created_by = u.id
LEFT JOIN profiles pr ON u.id = pr.id;

-- Grant permissions
GRANT SELECT ON inventory_movements_with_details TO authenticated;
GRANT SELECT ON inventory_movements_with_details TO anon;
