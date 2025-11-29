-- Complete RPC function for CRM customers search with all fields and server-side tags
-- This replaces all previous CRM RPC scripts

-- Drop existing function
DROP FUNCTION IF EXISTS crm_customers_search(text, integer, integer);

-- Create comprehensive RPC function with all fields
CREATE OR REPLACE FUNCTION crm_customers_search(
  search_query text DEFAULT NULL,
  limit_val integer DEFAULT 50,
  offset_val integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  city text,
  postal_code text,
  created_at timestamptz,
  newsletter_subscribed boolean,
  marketing_consent boolean,
  
  -- Order metrics
  order_count bigint,
  total_spent numeric,
  avg_order_value numeric,
  last_order_date timestamptz,
  days_since_last_order integer,
  
  -- Added pickup location and distribution person from customers table
  pickup_location_name text,
  distribution_person_name text,
  
  -- Added last_activity (same as last_order_date for now)
  last_activity timestamptz,
  
  -- Products and categories
  favorite_products jsonb,
  favorite_categories text[],
  
  -- Added server-side generated tags based on lib/customer-tags.ts logic
  tags text[]
) 
LANGUAGE plpgsql
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
    c.marketing_consent,
    
    -- Order metrics from orders table
    COALESCE(COUNT(DISTINCT o.id) FILTER (WHERE o.status != 'cancelled'), 0)::bigint AS order_count,
    COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0) AS total_spent,
    COALESCE(AVG(o.total) FILTER (WHERE o.status != 'cancelled'), 0) AS avg_order_value,
    MAX(o.created_at) FILTER (WHERE o.status != 'cancelled') AS last_order_date,
    CASE 
      WHEN MAX(o.created_at) FILTER (WHERE o.status != 'cancelled') IS NOT NULL 
      THEN EXTRACT(DAY FROM NOW() - MAX(o.created_at) FILTER (WHERE o.status != 'cancelled'))::integer
      ELSE NULL
    END AS days_since_last_order,
    
    -- Pickup location from customers.default_pickup_location_id
    COALESCE(pl.name, 'noch nicht zugewiesen') AS pickup_location_name,
    
    -- Distribution person from customers.default_distribution_person_id
    COALESCE(dp.name, 'noch nicht zugewiesen') AS distribution_person_name,
    
    -- Last activity = last order date
    MAX(o.created_at) FILTER (WHERE o.status != 'cancelled') AS last_activity,
    
    -- Favorite products as structured JSONB with product_id, name, quantity
    COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'product_id', oi.product_id,
          'name', oi.product_name,
          'quantity', COUNT(*)
        ))
        FROM order_items oi
        JOIN orders o2 ON oi.order_id = o2.id
        WHERE o2.customer_id = c.id 
          AND o2.status != 'cancelled'
        GROUP BY oi.product_id, oi.product_name
        ORDER BY COUNT(*) DESC
        LIMIT 5
      ),
      '[]'::jsonb
    ) AS favorite_products,
    
    -- Favorite categories from customer data
    c.favorite_categories,
    
    -- Generate tags server-side based on lib/customer-tags.ts logic
    (
      SELECT array_agg(DISTINCT tag)
      FROM (
        -- Favorite category tags
        SELECT 'Kategorie: ' || unnest(c.favorite_categories) AS tag
        WHERE c.favorite_categories IS NOT NULL AND array_length(c.favorite_categories, 1) > 0
        
        UNION ALL
        
        -- Order count based tags
        SELECT CASE
          WHEN COALESCE(COUNT(DISTINCT o3.id) FILTER (WHERE o3.status != 'cancelled'), 0) = 0 THEN 'Neukunde'
          WHEN COALESCE(COUNT(DISTINCT o3.id) FILTER (WHERE o3.status != 'cancelled'), 0) >= 10 THEN 'Stammkunde'
          WHEN COALESCE(COUNT(DISTINCT o3.id) FILTER (WHERE o3.status != 'cancelled'), 0) >= 5 THEN 'Wiederkäufer'
        END
        FROM orders o3
        WHERE o3.customer_id = c.id
        HAVING CASE
          WHEN COALESCE(COUNT(DISTINCT o3.id) FILTER (WHERE o3.status != 'cancelled'), 0) = 0 THEN 'Neukunde'
          WHEN COALESCE(COUNT(DISTINCT o3.id) FILTER (WHERE o3.status != 'cancelled'), 0) >= 10 THEN 'Stammkunde'
          WHEN COALESCE(COUNT(DISTINCT o3.id) FILTER (WHERE o3.status != 'cancelled'), 0) >= 5 THEN 'Wiederkäufer'
        END IS NOT NULL
        
        UNION ALL
        
        -- Spending based tags
        SELECT CASE
          WHEN COALESCE(SUM(o4.total) FILTER (WHERE o4.status != 'cancelled'), 0) >= 1000 THEN 'Premium-Kunde'
          WHEN COALESCE(SUM(o4.total) FILTER (WHERE o4.status != 'cancelled'), 0) >= 500 THEN 'Guter Kunde'
        END
        FROM orders o4
        WHERE o4.customer_id = c.id
        HAVING CASE
          WHEN COALESCE(SUM(o4.total) FILTER (WHERE o4.status != 'cancelled'), 0) >= 1000 THEN 'Premium-Kunde'
          WHEN COALESCE(SUM(o4.total) FILTER (WHERE o4.status != 'cancelled'), 0) >= 500 THEN 'Guter Kunde'
        END IS NOT NULL
        
        UNION ALL
        
        -- Newsletter subscriber tag
        SELECT 'Newsletter-Abonnent'
        WHERE c.newsletter_subscribed = true
        
        UNION ALL
        
        -- Reminder notifications tag
        SELECT 'Erinnerungen aktiv'
        WHERE c.reminder_notifications = true
        
        UNION ALL
        
        -- Customer status tags
        SELECT CASE
          WHEN c.customer_status = 'active' THEN 'Aktiver Kunde'
          WHEN c.customer_status = 'inactive' THEN 'Inaktiver Kunde'
        END
        WHERE c.customer_status IN ('active', 'inactive')
        
        UNION ALL
        
        -- Account status tag
        SELECT 'Registriert'
        WHERE c.account_status = 'has_account'
      ) AS all_tags
      WHERE tag IS NOT NULL
    ) AS tags
    
  FROM customers c
  -- LEFT JOIN with pickup_locations using default_pickup_location_id from customers
  LEFT JOIN pickup_locations pl ON c.default_pickup_location_id = pl.id
  -- LEFT JOIN with distribution_persons using default_distribution_person_id from customers
  LEFT JOIN distribution_persons dp ON c.default_distribution_person_id = dp.id
  LEFT JOIN orders o ON c.id = o.customer_id
  WHERE 
    (search_query IS NULL OR search_query = '' OR
     c.search_tsv @@ plainto_tsquery('german', search_query) OR
     c.email ILIKE '%' || search_query || '%' OR
     c.phone ILIKE '%' || search_query || '%')
    AND c.is_test = false
  GROUP BY 
    c.id, c.first_name, c.last_name, c.email, c.phone, c.city, c.postal_code,
    c.created_at, c.newsletter_subscribed, c.marketing_consent,
    c.favorite_categories, c.customer_status, c.reminder_notifications, c.account_status,
    pl.name, dp.name
  ORDER BY c.created_at DESC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION crm_customers_search TO authenticated, service_role;
