-- Extend existing crm_customers_search RPC with missing fields
-- This script adds: phone, pickup_location_name, distribution_person_name, last_activity, tags, favorite_products as JSONB

DROP FUNCTION IF EXISTS public.crm_customers_search(INT, INT, TEXT);

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
  last_activity TIMESTAMPTZ,
  pickup_location_name TEXT,
  distribution_person_name TEXT,
  favorite_products JSONB,
  tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Added product_favorites CTE to calculate favorite products separately to avoid nested aggregates
  WITH product_favorites AS (
    SELECT 
      o.customer_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'product_id', oi.product_id,
          'name', oi.product_name,
          'quantity', oi.quantity
        )
        ORDER BY oi.product_name
      ) FILTER (WHERE oi.product_name IS NOT NULL) AS products
    FROM public.orders o
    INNER JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY o.customer_id
  ),
  customer_stats AS (
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
      c.default_pickup_location_id,
      c.default_distribution_person_id,
      c.last_order_date,
      c.total_spent AS customer_total_spent,
      c.total_orders,
      c.customer_status,
      c.favorite_categories,
      COUNT(DISTINCT o.id) AS order_count,
      COALESCE(SUM(o.total), 0) AS total_spent,
      CASE 
        WHEN COUNT(DISTINCT o.id) > 0 
        THEN COALESCE(SUM(o.total) / COUNT(DISTINCT o.id), 0)
        ELSE 0
      END AS avg_order_value,
      MAX(o.created_at) AS last_order_date_calc,
      CASE 
        WHEN MAX(o.created_at) IS NOT NULL 
        THEN EXTRACT(DAY FROM NOW() - MAX(o.created_at))::INT
        ELSE NULL
      END AS days_since_last_order
    FROM public.customers c
    LEFT JOIN public.orders o ON o.customer_id = c.id AND o.status != 'cancelled'
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
      c.city, c.postal_code, c.created_at, c.newsletter_subscribed,
      c.default_pickup_location_id, c.default_distribution_person_id,
      c.last_order_date, c.total_spent, c.total_orders, c.customer_status,
      c.favorite_categories
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
    COALESCE(cs.last_order_date_calc, cs.last_order_date) AS last_order_date,
    cs.days_since_last_order,
    COALESCE(cs.last_order_date_calc, cs.last_order_date) AS last_activity,
    COALESCE(pl.name, 'noch nicht zugewiesen') AS pickup_location_name,
    COALESCE(dp.name, 'noch nicht zugewiesen') AS distribution_person_name,
    COALESCE(pf.products, '[]'::jsonb) AS favorite_products,
    ARRAY_REMOVE(ARRAY[
      CASE 
        WHEN cs.total_spent >= 1000 THEN 'Premium-Kunde'
        WHEN cs.total_spent >= 500 THEN 'Guter Kunde'
        ELSE NULL
      END,
      CASE 
        WHEN cs.order_count = 0 THEN 'Neukunde'
        WHEN cs.order_count >= 10 THEN 'Stammkunde'
        WHEN cs.order_count >= 5 THEN 'Wiederkäufer'
        ELSE NULL
      END,
      CASE WHEN cs.newsletter_subscribed THEN 'Newsletter-Abonnent' ELSE NULL END,
      CASE 
        WHEN cs.customer_status = 'active' THEN 'Aktiver Kunde'
        WHEN cs.customer_status = 'inactive' THEN 'Inaktiver Kunde'
        ELSE NULL
      END
    ], NULL) 
    || COALESCE(
      (SELECT ARRAY_AGG('Kategorie: ' || unnest) 
       FROM unnest(cs.favorite_categories) 
       LIMIT 3),
      ARRAY[]::TEXT[]
    ) AS tags
  FROM customer_stats cs
  LEFT JOIN public.pickup_locations pl ON pl.id = cs.default_pickup_location_id
  LEFT JOIN public.distribution_persons dp ON dp.id = cs.default_distribution_person_id
  LEFT JOIN product_favorites pf ON pf.customer_id = cs.id
  ORDER BY cs.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_customers_search(INT, INT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(INT, INT, TEXT) TO service_role;
