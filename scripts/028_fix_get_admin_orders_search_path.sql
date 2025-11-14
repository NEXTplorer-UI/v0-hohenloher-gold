-- Fix search_path issue for get_admin_orders function
-- This addresses the Supabase warning about "role mutable search_path"

DROP FUNCTION IF EXISTS public.get_admin_orders(TEXT, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.get_admin_orders(
  q TEXT DEFAULT '',
  status_filter TEXT DEFAULT NULL,
  limit_count INT DEFAULT 200,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  order_time TIMESTAMP WITH TIME ZONE,
  customer_id UUID,
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total NUMERIC,
  status TEXT,
  payment_status TEXT,
  payment_method TEXT,
  delivery_method TEXT,
  pickup_date DATE,
  pickup_location TEXT,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  qr_code_url TEXT,
  qr_code_type TEXT,
  qr_code_expires_at TIMESTAMP WITH TIME ZONE,
  order_items JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.order_time,
    o.customer_id,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone,
    o.total,
    o.status,
    o.payment_status,
    o.payment_method,
    o.delivery_method,
    o.pickup_date,
    o.pickup_location,
    o.notes,
    o.admin_notes,
    o.created_at,
    o.updated_at,
    o.qr_code_url,
    o.qr_code_type,
    o.qr_code_expires_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'product_size', oi.product_size,
            'product_category', oi.product_category
          )
        )
        FROM order_items oi
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ) as order_items
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE 
    (status_filter IS NULL OR o.status = status_filter)
    AND (
      q = '' 
      OR o.order_number ILIKE '%' || q || '%'
      OR c.first_name ILIKE '%' || q || '%'
      OR c.last_name ILIKE '%' || q || '%'
      OR c.email ILIKE '%' || q || '%'
      OR CONCAT(c.first_name, ' ', c.last_name) ILIKE '%' || q || '%'
    )
  ORDER BY o.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.get_admin_orders(TEXT, TEXT, INT, INT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_admin_orders(TEXT, TEXT, INT, INT) TO authenticated, anon;

COMMENT ON FUNCTION public.get_admin_orders IS 'Retrieves admin orders with customer details and order items. Uses SECURITY DEFINER with fixed search_path for security.';
