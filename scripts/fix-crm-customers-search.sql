-- Fix ambiguous crm_customers_search function
-- Drop existing functions and create a single clear version

DROP FUNCTION IF EXISTS public.crm_customers_search(text, integer, integer);
DROP FUNCTION IF EXISTS public.crm_customers_search(integer, integer, text);

CREATE OR REPLACE FUNCTION public.crm_customers_search(
  search_query text DEFAULT '',
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  plz text,
  city text,
  street_address text,
  notes text,
  created_at timestamptz,
  last_activity timestamptz,
  order_count bigint,
  total_spent numeric,
  avg_order_value numeric,
  last_order_date timestamptz,
  days_since_last_order integer,
  favorite_products text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    c.phone,
    c.plz,
    c.city,
    c.street_address,
    c.notes,
    c.created_at,
    COALESCE(MAX(o.created_at), c.created_at) as last_activity,
    COUNT(DISTINCT o.id)::bigint as order_count,
    COALESCE(SUM(o.total_amount), 0)::numeric as total_spent,
    CASE 
      WHEN COUNT(DISTINCT o.id) > 0 THEN (COALESCE(SUM(o.total_amount), 0) / COUNT(DISTINCT o.id))::numeric
      ELSE 0::numeric
    END as avg_order_value,
    MAX(o.created_at) as last_order_date,
    CASE 
      WHEN MAX(o.created_at) IS NOT NULL THEN EXTRACT(DAY FROM NOW() - MAX(o.created_at))::integer
      ELSE NULL
    END as days_since_last_order,
    STRING_AGG(DISTINCT p.name, ', ' ORDER BY p.name) as favorite_products
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
  LEFT JOIN order_items oi ON o.id = oi.order_id
  LEFT JOIN products p ON oi.product_id = p.id
  WHERE 
    search_query = '' OR
    c.email ILIKE '%' || search_query || '%' OR
    c.first_name ILIKE '%' || search_query || '%' OR
    c.last_name ILIKE '%' || search_query || '%' OR
    c.phone ILIKE '%' || search_query || '%' OR
    c.plz ILIKE '%' || search_query || '%' OR
    c.city ILIKE '%' || search_query || '%'
  GROUP BY c.id
  ORDER BY last_activity DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;
