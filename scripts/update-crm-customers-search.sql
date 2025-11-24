-- Erweitere die crm_customers_search RPC-Funktion um alle fehlenden KPI-Berechnungen

CREATE OR REPLACE FUNCTION public.crm_customers_search(
  q text DEFAULT NULL,
  limit_count integer DEFAULT 50,
  offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  postal_code text,
  account_status text,
  customer_status text,
  order_count bigint,
  total_spent numeric,
  avg_order_value numeric,
  last_order_date timestamp with time zone,
  days_since_last_order integer,
  favorite_products text,
  last_activity timestamp with time zone,
  tags text[],
  newsletter_subscribed boolean,
  marketing_consent boolean,
  reminder_notifications boolean
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
    c.account_status,
    c.customer_status,
    COALESCE(c.total_orders, 0) AS order_count,
    COALESCE(c.total_spent, 0)::numeric(12,2) AS total_spent,
    -- Berechne Durchschnittsbestellwert
    CASE 
      WHEN COALESCE(c.total_orders, 0) > 0 THEN (COALESCE(c.total_spent, 0) / c.total_orders)::numeric(12,2)
      ELSE 0::numeric(12,2)
    END AS avg_order_value,
    -- Hole das Datum der letzten Bestellung
    c.last_order_date,
    -- Berechne Tage seit letzter Bestellung
    CASE 
      WHEN c.last_order_date IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - c.last_order_date))::integer
      ELSE NULL
    END AS days_since_last_order,
    -- Hole die Top 3 Lieblingsprodukte aus order_items
    (
      SELECT STRING_AGG(p.name, ', ')
      FROM (
        SELECT pr.name, COUNT(*) as purchase_count
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products pr ON pr.id = oi.product_id
        WHERE o.customer_id = c.id
        GROUP BY pr.name
        ORDER BY purchase_count DESC
        LIMIT 3
      ) p
    ) AS favorite_products,
    GREATEST(c.updated_at, c.last_order_date) AS last_activity,
    COALESCE(c.favorite_categories, ARRAY[]::text[]) AS tags,
    c.newsletter_subscribed,
    c.marketing_consent,
    c.reminder_notifications
  FROM public.customers c
  WHERE
    q IS NULL
    OR c.first_name ILIKE '%' || q || '%'
    OR c.last_name  ILIKE '%' || q || '%'
    OR c.email ILIKE '%' || q || '%'
    OR c.city ILIKE '%' || q || '%'
  ORDER BY last_activity DESC NULLS LAST, c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;
