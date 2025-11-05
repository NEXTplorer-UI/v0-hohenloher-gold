-- Fix get_admin_orders RPC to include qr_code_url
-- This ensures the admin orders API returns QR code URLs for the print page

DROP FUNCTION IF EXISTS get_admin_orders(text, text, integer, integer);

CREATE OR REPLACE FUNCTION get_admin_orders(
  q text DEFAULT '',
  status_filter text DEFAULT NULL,
  limit_count integer DEFAULT 200,
  offset_count integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  order_number text,
  customer_id uuid,
  status text,
  total numeric,
  delivery_method text,
  pickup_location text,
  payment_method text,
  payment_status text,
  notes text,
  created_at timestamptz,
  qr_code_url text,
  customer jsonb,
  order_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
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
    jsonb_build_object(
      'first_name', c.first_name,
      'last_name', c.last_name,
      'email', c.email,
      'phone', c.phone
    ) AS customer,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'product_id', oi.product_id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price
          )
        )
        FROM order_items oi
        WHERE oi.order_id = o.id
      ),
      '[]'::jsonb
    ) AS order_items
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  WHERE
    (status_filter IS NULL OR o.status = status_filter)
    AND (
      q = '' OR
      o.order_number ILIKE '%' || q || '%' OR
      c.first_name ILIKE '%' || q || '%' OR
      c.last_name ILIKE '%' || q || '%' OR
      c.email ILIKE '%' || q || '%'
    )
  ORDER BY o.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;
