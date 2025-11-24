-- Drop existing function
DROP FUNCTION IF EXISTS public.crm_customers_search(integer, integer, text);

-- Recreate function with correct column names (postal_code instead of plz, etc.)
CREATE OR REPLACE FUNCTION public.crm_customers_search(
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  postal_code text,
  street text,
  house_number text,
  newsletter_subscribed boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_order_date timestamp with time zone,
  total_spent numeric,
  order_count bigint,
  avg_order_value numeric,
  days_since_last_order integer,
  favorite_products text,
  marketing_consent boolean,
  customer_status text,
  is_test boolean
) AS $$
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
    c.street,
    c.house_number,
    c.newsletter_subscribed,
    c.created_at,
    c.updated_at,
    c.last_order_date,
    COALESCE(c.total_spent, 0) as total_spent,
    COUNT(DISTINCT o.id)::bigint as order_count,
    CASE 
      WHEN COUNT(DISTINCT o.id) > 0 THEN COALESCE(c.total_spent, 0) / COUNT(DISTINCT o.id)
      ELSE 0
    END as avg_order_value,
    CASE 
      WHEN c.last_order_date IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - c.last_order_date))::integer
      ELSE NULL
    END as days_since_last_order,
    (
      SELECT STRING_AGG(DISTINCT oi.product_name, ', ')
      FROM orders o2
      JOIN order_items oi ON oi.order_id = o2.id
      WHERE o2.customer_id = c.id
        AND o2.status IN ('completed', 'picked_up')
      GROUP BY o2.customer_id
      ORDER BY COUNT(*) DESC
      LIMIT 3
    ) as favorite_products,
    c.marketing_consent,
    c.customer_status,
    c.is_test
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id
  WHERE 
    (search_query IS NULL OR search_query = '' OR
     c.first_name ILIKE '%' || search_query || '%' OR
     c.last_name ILIKE '%' || search_query || '%' OR
     c.email ILIKE '%' || search_query || '%' OR
     c.phone ILIKE '%' || search_query || '%' OR
     c.city ILIKE '%' || search_query || '%' OR
     c.postal_code ILIKE '%' || search_query || '%')
  GROUP BY c.id
  ORDER BY c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.crm_customers_search(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(integer, integer, text) TO anon;
