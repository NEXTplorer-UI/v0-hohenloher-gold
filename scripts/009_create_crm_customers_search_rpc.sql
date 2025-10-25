-- =========================================================
-- CRM Customers Search RPC (für /rest/v1/rpc/crm_customers_search)
-- =========================================================

-- 1) Saubere Neuanlage
DROP FUNCTION IF EXISTS public.crm_customers_search(integer, integer, text);

-- 2) Funktion erstellen
--    - SECURITY DEFINER: Um RLS/Grants auf Tabellen zu kapseln
--    - STABLE: Lesender Zugriff, kann gecached werden
--    - Rückgabe enthält nur die Spalten, die das UI braucht
CREATE OR REPLACE FUNCTION public.crm_customers_search(
  limit_count  integer DEFAULT 50,
  offset_count integer DEFAULT 0,
  q            text    DEFAULT NULL
)
RETURNS TABLE (
  id              uuid,
  first_name      text,
  last_name       text,
  email           text,
  phone           text,
  city            text,
  postal_code     text,
  account_status  text,
  customer_status text,
  order_count     integer,
  total_spent     numeric(12,2),
  last_activity   timestamptz,
  tags            text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE(c.total_orders, 0)                    AS order_count,
    COALESCE(c.total_spent, 0)::numeric(12,2)      AS total_spent,
    GREATEST(c.updated_at, c.last_order_date)      AS last_activity,
    COALESCE(c.favorite_categories, ARRAY[]::text[]) AS tags
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
$$;

-- 3) Rechte vergeben (damit Web/API sie aufrufen darf)
GRANT EXECUTE ON FUNCTION public.crm_customers_search(integer, integer, text) TO anon;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(integer, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_customers_search(integer, integer, text) TO service_role;

-- 4) PostgREST Schema-Cache neu laden (wichtig, sonst 404)
NOTIFY pgrst, 'reload schema';
