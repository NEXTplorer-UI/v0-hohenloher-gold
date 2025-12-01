-- Create efficient RPC function for admin order search
-- Similar to crm_customers_search but for orders

DROP FUNCTION IF EXISTS public.admin_orders_search(INT, INT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_orders_search(
  limit_count INT DEFAULT 50,
  offset_count INT DEFAULT 0,
  search_query TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  order_number TEXT,
  customer_id TEXT,
  status TEXT,
  total NUMERIC,
  delivery_method TEXT,
  pickup_location TEXT,
  payment_method TEXT,
  payment_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  qr_code_url TEXT,
  pickup_token TEXT,
  admin_notes TEXT,
  hellocash_invoice_id TEXT,
  hellocash_invoice_number TEXT,
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_orders AS (
    -- Fixed table name from Order to orders (lowercase)
    SELECT 
      o.id,
      o.order_number,
      o.customer_id,
      o.status,
      o.total,
      o.delivery_method,
      o.pickup_location,
      o.payment_method,
      o.payment_status,
      o.notes,
      o.created_at,
      o.qr_code_url,
      o.pickup_token,
      o.admin_notes,
      o.hellocash_invoice_id,
      o.hellocash_invoice_number,
      c.first_name AS customer_first_name,
      c.last_name AS customer_last_name,
      c.email AS customer_email,
      c.phone AS customer_phone
    FROM public.orders o
    LEFT JOIN public.customers c ON c.id = o.customer_id
    WHERE 
      -- Status filter
      (status_filter IS NULL OR status_filter = '' OR status_filter = 'all' OR 
       (status_filter = 'picked_up' AND o.status = 'completed') OR
       (status_filter != 'picked_up' AND o.status = status_filter))
      -- Search filter
      AND (search_query IS NULL OR search_query = '' OR
           o.order_number ILIKE '%' || search_query || '%' OR
           c.first_name ILIKE '%' || search_query || '%' OR
           c.last_name ILIKE '%' || search_query || '%' OR
           c.email ILIKE '%' || search_query || '%' OR
           (c.first_name || ' ' || c.last_name) ILIKE '%' || search_query || '%')
    ORDER BY o.created_at DESC
    LIMIT limit_count
    OFFSET offset_count
  ),
  order_items_aggregated AS (
    SELECT 
      oi.order_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', oi.id,
          'product_id', oi.product_id,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'total_price', oi.total_price,
          'product_name', oi.product_name,
          'product_category', oi.product_category,
          'product_size', oi.product_size,
          'product', JSONB_BUILD_OBJECT(
            'name', p.name,
            'unit', p.unit,
            'image_url', p.image_url
          )
        )
        ORDER BY oi.id
      ) AS items
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id IN (SELECT fo.id FROM filtered_orders fo)
    GROUP BY oi.order_id
  )
  SELECT 
    -- Cast all UUID columns to TEXT to match expected return type
    fo.id::TEXT,
    fo.order_number,
    fo.customer_id::TEXT,
    fo.status,
    fo.total,
    fo.delivery_method,
    fo.pickup_location,
    fo.payment_method,
    fo.payment_status,
    fo.notes,
    fo.created_at,
    fo.qr_code_url,
    fo.pickup_token::TEXT,
    fo.admin_notes,
    fo.hellocash_invoice_id,
    fo.hellocash_invoice_number,
    fo.customer_first_name,
    fo.customer_last_name,
    fo.customer_email,
    fo.customer_phone,
    COALESCE(oia.items, '[]'::jsonb) AS order_items
  FROM filtered_orders fo
  LEFT JOIN order_items_aggregated oia ON oia.order_id = fo.id
  ORDER BY fo.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_orders_search(INT, INT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_orders_search(INT, INT, TEXT, TEXT) TO service_role;
