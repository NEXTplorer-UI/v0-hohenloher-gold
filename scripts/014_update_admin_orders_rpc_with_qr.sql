-- ============================
-- Update get_admin_orders RPC to include QR code and invoice fields
-- ============================

CREATE OR REPLACE FUNCTION public.get_admin_orders(
  q TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INT DEFAULT 200,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  customer_id UUID,
  status TEXT,
  total NUMERIC,
  delivery_method TEXT,
  pickup_location TEXT,
  payment_method TEXT,
  payment_status TEXT,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ,
  qr_code_url TEXT,
  qr_code_expires_at TIMESTAMPTZ,
  hellocash_invoice_id TEXT,
  hellocash_invoice_number TEXT,
  customer JSONB,
  order_items JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
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
      o.admin_notes,
      o.created_at,
      o.qr_code_url,
      o.qr_code_expires_at,
      o.hellocash_invoice_id,
      o.hellocash_invoice_number,
      jsonb_build_object(
        'first_name', c.first_name,
        'last_name',  c.last_name,
        'email',      c.email,
        'phone',      c.phone
      ) AS customer,
      (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_name', COALESCE(oi.product_name, p.name),
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'product_id', oi.product_id,
              'weight', p.weight_kg
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::jsonb
        )
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = o.id
      ) AS order_items
    FROM orders o
    LEFT JOIN customers c ON c.id = o.customer_id
    WHERE
      (q IS NULL OR q = '' OR
        o.order_number ILIKE '%'||q||'%' OR
        c.email ILIKE '%'||q||'%' OR
        COALESCE(c.first_name,'')||' '||COALESCE(c.last_name,'') ILIKE '%'||q||'%')
      AND (status_filter IS NULL OR status_filter = '' OR o.status = status_filter)
    ORDER BY o.created_at DESC
    LIMIT limit_count
    OFFSET offset_count
  )
  SELECT * FROM base;
END;
$$;

COMMENT ON FUNCTION public.get_admin_orders IS
'Admin-Orders für CRM-UI mit QR-Code und Rechnungsfeldern (verschachtelte Struktur: customer{}, order_items[]). SECURITY DEFINER um RLS zu umgehen.';
