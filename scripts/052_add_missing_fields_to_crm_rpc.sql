-- Add missing fields to crm_customers_search RPC:
-- - pickup_location_normalized (from last order)
-- - default_distribution_person_name (JOIN with distribution_persons)
-- - last_activity (already have as last_order_date)

DROP FUNCTION IF EXISTS crm_customers_search(text, int, int);

CREATE OR REPLACE FUNCTION crm_customers_search(
  search_query text DEFAULT NULL,
  result_limit int DEFAULT 50,
  result_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  postal_code text,
  created_at timestamp with time zone,
  newsletter_subscribed boolean,
  order_count bigint,
  total_spent numeric,
  avg_order_value numeric,
  last_order_date timestamp with time zone,
  days_since_last_order integer,
  favorite_products jsonb,
  -- Added new fields for customer table display
  pickup_location_normalized text,
  default_distribution_person_name text,
  last_activity timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.city,
    c.postal_code,
    c.created_at,
    c.newsletter_subscribed,
    -- Order statistics (only non-cancelled orders)
    COUNT(DISTINCT CASE WHEN o.status != 'cancelled' THEN o.id END) as order_count,
    COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total END), 0) as total_spent,
    COALESCE(AVG(CASE WHEN o.status != 'cancelled' THEN o.total END), 0) as avg_order_value,
    MAX(o.created_at) as last_order_date,
    CASE 
      WHEN MAX(o.created_at) IS NOT NULL 
      THEN EXTRACT(DAY FROM NOW() - MAX(o.created_at))::integer
      ELSE NULL
    END as days_since_last_order,
    -- Favorite products as structured JSONB with product_id, name, quantity
    COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'product_id', sub.product_id,
            'name', sub.product_name,
            'quantity', sub.total_quantity
          )
        )
        FROM (
          SELECT 
            oi.product_id,
            oi.product_name,
            SUM(oi.quantity) as total_quantity
          FROM order_items oi
          INNER JOIN orders o2 ON oi.order_id = o2.id
          WHERE o2.customer_id = c.id 
            AND o2.status != 'cancelled'
          GROUP BY oi.product_id, oi.product_name
          ORDER BY total_quantity DESC
          LIMIT 5
        ) sub
      ),
      '[]'::jsonb
    ) as favorite_products,
    -- Pickup location from most recent order (pickup_location_normalized from orders table)
    (
      SELECT o3.pickup_location_normalized
      FROM orders o3
      WHERE o3.customer_id = c.id
        AND o3.pickup_location_normalized IS NOT NULL
      ORDER BY o3.created_at DESC
      LIMIT 1
    ) as pickup_location_normalized,
    -- Distribution person name via JOIN (default_distribution_person_id links to distribution_persons)
    dp.name as default_distribution_person_name,
    -- Last activity = last order date (same as last_order_date)
    MAX(o.created_at) as last_activity
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
  LEFT JOIN distribution_persons dp ON c.default_distribution_person_id = dp.id
  WHERE 
    c.is_test = false
    AND (
      search_query IS NULL 
      OR search_query = ''
      OR c.search_tsv @@ plainto_tsquery('simple', search_query)
      OR c.email ILIKE '%' || search_query || '%'
      OR c.first_name ILIKE '%' || search_query || '%'
      OR c.last_name ILIKE '%' || search_query || '%'
      OR c.phone ILIKE '%' || search_query || '%'
    )
  GROUP BY 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.city,
    c.postal_code,
    c.created_at,
    c.newsletter_subscribed,
    dp.name
  ORDER BY c.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;
