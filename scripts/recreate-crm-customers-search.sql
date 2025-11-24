-- Drop all existing crm_customers_search functions to resolve ambiguity
DROP FUNCTION IF EXISTS public.crm_customers_search(text, integer, integer);
DROP FUNCTION IF EXISTS public.crm_customers_search(integer, integer, text);

-- Create single RPC function with correct parameter order matching API call
-- API calls: .rpc('crm_customers_search', { limit_count, offset_count, search_query })
CREATE OR REPLACE FUNCTION public.crm_customers_search(
  limit_count INT DEFAULT 50,
  offset_count INT DEFAULT 0,
  search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  postal_code TEXT,
  created_at TIMESTAMPTZ,
  newsletter_subscribed BOOLEAN,
  order_count BIGINT,
  total_spent NUMERIC,
  avg_order_value NUMERIC,
  last_order_date TIMESTAMPTZ,
  days_since_last_order INT,
  favorite_products TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH customer_stats AS (
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
      COUNT(DISTINCT o.id) AS order_count,
      COALESCE(SUM(o.total), 0) AS total_spent,
      CASE 
        WHEN COUNT(DISTINCT o.id) > 0 
        THEN COALESCE(SUM(o.total) / COUNT(DISTINCT o.id), 0)
        ELSE 0
      END AS avg_order_value,
      MAX(o.created_at) AS last_order_date,
      CASE 
        WHEN MAX(o.created_at) IS NOT NULL 
        THEN EXTRACT(DAY FROM NOW() - MAX(o.created_at))::INT
        ELSE NULL
      END AS days_since_last_order,
      STRING_AGG(
        DISTINCT oi.product_name, 
        ', ' 
        ORDER BY oi.product_name
      ) FILTER (WHERE oi.product_name IS NOT NULL) AS favorite_products
    FROM public.customers c
    LEFT JOIN public.orders o ON o.customer_id = c.id AND o.status != 'cancelled'
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    WHERE 
      (search_query IS NULL OR 
       c.first_name ILIKE '%' || search_query || '%' OR
       c.last_name ILIKE '%' || search_query || '%' OR
       c.email ILIKE '%' || search_query || '%' OR
       c.city ILIKE '%' || search_query || '%' OR
       c.postal_code ILIKE '%' || search_query || '%' OR
       c.phone ILIKE '%' || search_query || '%')
    GROUP BY 
      c.id, c.first_name, c.last_name, c.email, c.phone, 
      c.city, c.postal_code, c.created_at, c.newsletter_subscribed
  )
  SELECT 
    cs.id,
    cs.first_name,
    cs.last_name,
    cs.email,
    cs.phone,
    cs.city,
    cs.postal_code,
    cs.created_at,
    cs.newsletter_subscribed,
    cs.order_count,
    cs.total_spent,
    cs.avg_order_value,
    cs.last_order_date,
    cs.days_since_last_order,
    cs.favorite_products
  FROM customer_stats cs
  ORDER BY cs.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.crm_customers_search(INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(INT, INT, TEXT) TO service_role;
